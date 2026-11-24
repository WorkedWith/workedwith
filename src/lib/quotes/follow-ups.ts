import type { createAdminClient } from '@/lib/supabase/admin'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient, messageTrade } from '@/lib/messages/send'
import { depositDueEmail, quoteExpiredClientEmail, quoteNudgeEmail, tradeQuoteEventEmail } from '@/lib/email/templates-v42'
import { smsDepositDue, smsQuoteNudge } from '@/lib/sms/copy-v42'
import type { Quote } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

const DAY = 86_400_000
const daysSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / DAY : 0)
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

async function once(admin: AdminClient, quoteId: string, kind: string): Promise<boolean> {
  const { error } = await admin.from('quote_follow_ups').insert({ quote_id: quoteId, kind })
  return !error // unique (quote_id, kind): a second insert fails, so each follow up goes once
}

async function clientOf(admin: AdminClient, jobId: string): Promise<string | null> {
  const { data } = await admin.from('jobs').select('client_user_id').eq('id', jobId).maybeSingle()
  return (data?.client_user_id as string | null) ?? null
}

/**
 * Daily (PRD 6). Quote follow ups (switchable per quote), expiry, and unpaid deposit reminders at day 1,
 * 3 and 6 with expiry at day 7 unless extended. Deposit reminders are part of the payment flow, so they
 * can't be switched off.
 */
export async function runQuoteFollowUps(admin: AdminClient): Promise<Record<string, number>> {
  const out = { nudges: 0, expired: 0, depositReminders: 0, depositExpired: 0 }
  const today = new Date().toISOString().slice(0, 10)

  const { data: open } = await admin.from('quotes').select('*').in('status', ['sent', 'viewed', 'changes_requested']).limit(1000)
  for (const q of (open ?? []) as Quote[]) {
    const clientId = await clientOf(admin, q.job_id)
    if (!clientId) continue
    const sender = await getTradeSender(admin, q.trade_user_id)

    if (q.valid_until < today) {
      await admin.from('quotes').update({ status: 'expired', expired_at: new Date().toISOString() }).eq('id', q.id)
      await messageClient(admin, { tradeUserId: q.trade_user_id, clientUserId: clientId, email: quoteExpiredClientEmail({ business: sender.businessName, title: q.title, reason: 'validity' }) })
      await messageTrade(admin, { tradeUserId: q.trade_user_id, type: 'quote', title: `Quote expired: ${q.title}`, body: `${q.client_name} did not accept in time.`, link: `/jobs/${q.job_id}`, email: tradeQuoteEventEmail({ title: q.title, client: q.client_name, event: 'expired', jobId: q.job_id }) })
      out.expired++
      continue
    }
    if (!q.follow_ups_enabled || q.status === 'changes_requested') continue

    let kind: string | null = null
    let type: 'viewed' | 'unopened' | 'expiring' = 'viewed'
    const expiresIn = (new Date(`${q.valid_until}T23:59:59Z`).getTime() - Date.now()) / DAY
    if (expiresIn <= 3) { kind = 'expiring'; type = 'expiring' }
    else if (q.status === 'sent' && daysSince(q.sent_at) >= 3) { kind = 'unopened_3'; type = 'unopened' }
    else if (q.status === 'viewed' && daysSince(q.viewed_at) >= 7) kind = 'viewed_7'
    else if (q.status === 'viewed' && daysSince(q.viewed_at) >= 3) kind = 'viewed_3'
    if (!kind || !(await once(admin, q.id, kind))) continue

    const link = await createAccessLink(admin, { clientUserId: clientId, purpose: 'quote', targetPath: `/my/quotes/${q.id}`, createdBy: q.trade_user_id })
    await messageClient(admin, {
      tradeUserId: q.trade_user_id, clientUserId: clientId,
      email: quoteNudgeEmail({ business: sender.businessName, title: q.title, link, kind: type, expiresOn: fmt(q.valid_until) }),
      sms: smsQuoteNudge(sender.businessName, link),
    })
    out.nudges++
  }

  // Unpaid deposits
  const { data: accepted } = await admin.from('quotes').select('*').eq('status', 'accepted').eq('deposit_required', true).limit(1000)
  for (const q of (accepted ?? []) as Quote[]) {
    const { data: dep } = await admin.from('payment_stages').select('id, status').eq('job_id', q.job_id).eq('is_deposit', true).maybeSingle()
    if (!dep || dep.status === 'paid') continue
    const { data: job } = await admin.from('jobs').select('status, client_user_id').eq('id', q.job_id).maybeSingle()
    if (!job || job.status !== 'quoted' || !job.client_user_id) continue
    const sender = await getTradeSender(admin, q.trade_user_id)

    if (q.deposit_due_by && new Date(q.deposit_due_by).getTime() < Date.now()) {
      await admin.from('quotes').update({ status: 'expired', expired_at: new Date().toISOString() }).eq('id', q.id)
      await messageClient(admin, { tradeUserId: q.trade_user_id, clientUserId: job.client_user_id as string, email: quoteExpiredClientEmail({ business: sender.businessName, title: q.title, reason: 'deposit' }) })
      await messageTrade(admin, { tradeUserId: q.trade_user_id, type: 'quote', title: `Deposit not paid: ${q.title}`, body: 'The quote has expired. You can give 7 more days from the job.', link: `/jobs/${q.job_id}`, email: tradeQuoteEventEmail({ title: q.title, client: q.client_name, event: 'deposit_expired', jobId: q.job_id }) })
      out.depositExpired++
      continue
    }
    const age = daysSince(q.accepted_at)
    const day = age >= 6 ? 6 : age >= 3 ? 3 : age >= 1 ? 1 : 0
    if (!day || !(await once(admin, q.id, `deposit_${day}`))) continue
    const link = await createAccessLink(admin, { clientUserId: job.client_user_id as string, purpose: 'invoice', targetPath: `/my/jobs/${q.job_id}`, createdBy: q.trade_user_id })
    await messageClient(admin, {
      tradeUserId: q.trade_user_id, clientUserId: job.client_user_id as string,
      email: depositDueEmail({ business: sender.businessName, title: q.title, depositPence: q.deposit_amount_pence, link, day: day as 1 | 3 | 6, expiresOn: q.deposit_due_by ? fmt(q.deposit_due_by) : '' }),
      sms: smsDepositDue(sender.businessName, link),
    })
    out.depositReminders++
  }
  return out
}
