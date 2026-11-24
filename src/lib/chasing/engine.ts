import type { createAdminClient } from '@/lib/supabase/admin'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient, messageTrade } from '@/lib/messages/send'
import { getPayeeDetails } from '@/lib/getting-paid/bank-account'
import { chaseEmail, lbaPromptTradeEmail, type ChaseCopyStep } from '@/lib/email/templates-v42'
import { smsChase } from '@/lib/sms/copy-v42'
import { hasActivePlan } from '@/lib/plan'
import { openReviewWindow } from '@/lib/reviews/windows'
import { logJobEvent } from '@/lib/jobs/events'
import type { ChaseStep, Invoice, PaymentStage, StageStatus } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

const DAY = 86_400_000

/** PRD 10 schedule, in days from the due date. */
export const SCHEDULE: { step: ChaseStep; day: number }[] = [
  { step: 'heads_up', day: -2 },
  { step: 'due_today', day: 0 },
  { step: 'late_1', day: 3 },
  { step: 'late_2', day: 7 },
  { step: 'final', day: 14 },
  { step: 'lba_prompt', day: 21 },
  { step: 'review_window', day: 30 },
]

/** The latest step that is due, so a missed day never sends a backlog of messages. */
export function currentStep(dueAt: Date, now = new Date()): ChaseStep | null {
  const days = Math.floor((now.getTime() - dueAt.getTime()) / DAY)
  let step: ChaseStep | null = null
  for (const s of SCHEDULE) if (days >= s.day) step = s.step
  return step
}

/** Add working days (Mon to Fri) to a date. */
export function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from)
  let left = n
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) left--
  }
  return d
}

const DUE: StageStatus[] = ['approved', 'requested_by_trade', 'part_paid', 'overdue']

/**
 * Daily chasing (PRD 10). Runs on each due stage that isn't fully paid. Stops the moment a payment is
 * recorded (the stage is no longer due). "I've paid" pauses it for 3 working days. The trade can pause or
 * stop it per job. Lapsed trials and plans stop it. Deposits are chased separately and never reach a
 * letter before action.
 */
export async function runChasing(admin: AdminClient): Promise<Record<string, number>> {
  const out = { sent: 0, overdue: 0, lbaPrompts: 0, windows: 0, skipped: 0 }
  const { data } = await admin.from('payment_stages').select('*').in('status', DUE).eq('is_deposit', false).limit(3000)
  const now = new Date()
  for (const st of (data ?? []) as PaymentStage[]) {
    if (st.amount_paid_pence >= st.amount_pence || !st.due_at) continue
    const due = new Date(st.due_at)
    const { data: job } = await admin.from('jobs').select('id, title, trade_user_id, client_user_id, chasing_paused, chasing_stopped').eq('id', st.job_id).maybeSingle()
    if (!job?.trade_user_id || !job.client_user_id) continue

    if (due.getTime() < now.getTime() - DAY && st.status !== 'overdue' && st.status !== 'part_paid') {
      await admin.from('payment_stages').update({ status: 'overdue' }).eq('id', st.id)
      out.overdue++
    }

    const step = currentStep(due, now)
    if (!step) continue

    // The review window opens at 30 days overdue whatever the chasing settings (PRD 13)
    if (step === 'review_window') {
      const { error } = await admin.from('chase_events').insert({ stage_id: st.id, job_id: job.id, step, channel: 'none' })
      if (!error) {
        await openReviewWindow(admin, job.id, 'overdue_30_days')
        out.windows++
      }
      continue
    }

    if (job.chasing_stopped || job.chasing_paused) { out.skipped++; continue }
    if (st.client_says_paid_at && addWorkingDays(new Date(st.client_says_paid_at), 3) > now) { out.skipped++; continue }
    if (!(await hasActivePlan(job.trade_user_id, admin))) { out.skipped++; continue }

    const { error: dupe } = await admin.from('chase_events').insert({ stage_id: st.id, job_id: job.id, step, channel: step === 'lba_prompt' ? 'trade' : 'email_and_text' })
    if (dupe) continue // already sent

    const { data: inv } = await admin.from('invoices').select('*').eq('stage_id', st.id).neq('status', 'credited').maybeSingle()
    const invoice = inv as Invoice | null
    if (!invoice) continue
    const balance = st.amount_pence - st.amount_paid_pence

    if (step === 'lba_prompt') {
      const { data: cu } = await admin.from('users').select('full_name').eq('id', job.client_user_id).maybeSingle()
      await messageTrade(admin, { tradeUserId: job.trade_user_id, type: 'payment', title: `${invoice.invoice_number} is 21 days overdue`, body: 'You can now send a letter before action.', link: `/jobs/${job.id}/letter`, email: lbaPromptTradeEmail({ client: (cu?.full_name as string | undefined) ?? 'Your client', invoiceNumber: invoice.invoice_number, balancePence: balance, jobId: job.id }) })
      out.lbaPrompts++
      continue
    }

    const sender = await getTradeSender(admin, job.trade_user_id)
    const payee = await getPayeeDetails(admin, job.trade_user_id)
    const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'invoice', targetPath: `/my/invoices/${invoice.id}`, createdBy: job.trade_user_id })
    await messageClient(admin, {
      tradeUserId: job.trade_user_id, clientUserId: job.client_user_id,
      email: chaseEmail({ step: step as ChaseCopyStep, business: sender.businessName, invoiceNumber: invoice.invoice_number, balancePence: balance, dueOn: due.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }), link, payee, requestedByTrade: invoice.approval_basis === 'requested_by_trade' }),
      sms: smsChase(sender.businessName, step, invoice.invoice_number, link),
    })
    await logJobEvent(admin, job.id, 'chase', `Reminder sent: ${step.replace('_', ' ')} for ${invoice.invoice_number}`, null, { step, invoice: invoice.invoice_number })
    out.sent++
  }
  return out
}
