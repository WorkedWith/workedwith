import type Stripe from 'stripe'
import type { createAdminClient } from '@/lib/supabase/admin'
import { recordPayment } from '@/lib/payments/apply'
import { messageTrade } from '@/lib/messages/send'
import { chargebackTradeEmail } from '@/lib/email/templates-v42'
import { smsChargeback } from '@/lib/sms/copy-v42'
import { logJobEvent } from '@/lib/jobs/events'
import { APP_URL } from '@/lib/app-url'
import { stripeFeeFor } from './stripe-connect'
import type { Payment, PaymentStage } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** Events from trades' own Stripe accounts (PRD 9 cards and chargebacks). */
export async function handleConnectEvent(admin: AdminClient, event: Stripe.Event): Promise<void> {
  const account = event.account as string
  switch (event.type) {
    case 'account.updated': {
      const a = event.data.object as Stripe.Account
      await admin.from('trade_card_accounts').update({ charges_enabled: !!a.charges_enabled, payouts_enabled: !!a.payouts_enabled, updated_at: new Date().toISOString() }).eq('stripe_account_id', a.id)
      break
    }
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session
      const stageId = s.metadata?.stage_id
      const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id
      if (!stageId || !pi || s.payment_status !== 'paid' || !s.amount_total) break
      const { data: dup } = await admin.from('payments').select('id').eq('stripe_payment_intent_id', pi).maybeSingle()
      if (dup) break
      await recordPayment(admin, { stageId, amountPence: s.amount_total, method: 'card', stripePaymentIntentId: pi, stripeFeePence: await stripeFeeFor(account, pi) })
      break
    }
    case 'charge.dispute.created': {
      const d = event.data.object as Stripe.Dispute
      const pi = typeof d.payment_intent === 'string' ? d.payment_intent : d.payment_intent?.id
      if (!pi) break
      await openChargeback(admin, pi, d.id, d.amount, d.reason, d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toISOString() : null)
      break
    }
    case 'charge.dispute.closed': {
      const d = event.data.object as Stripe.Dispute
      await closeChargeback(admin, d.id, d.status === 'won' ? 'won' : d.status === 'lost' ? 'lost' : 'warning_closed')
      break
    }
  }
}

export async function openChargeback(admin: AdminClient, paymentIntentId: string, disputeId: string, amount: number, reason: string | null, dueAt: string | null): Promise<void> {
  const { data: p } = await admin.from('payments').select('*').eq('stripe_payment_intent_id', paymentIntentId).maybeSingle()
  const payment = p as Payment | null
  if (!payment) return
  const { data: job } = await admin.from('jobs').select('trade_user_id').eq('id', payment.job_id).maybeSingle()
  if (!job?.trade_user_id) return
  await admin.from('chargebacks').upsert({ payment_id: payment.id, job_id: payment.job_id, trade_id: job.trade_user_id, stripe_dispute_id: disputeId, amount_pence: amount, reason, evidence_due_at: dueAt }, { onConflict: 'stripe_dispute_id' })
  await logJobEvent(admin, payment.job_id, 'chargeback', 'The client disputed a card payment with their bank', null)
  await messageTrade(admin, {
    tradeUserId: job.trade_user_id, type: 'payment', title: 'A card payment has been disputed', body: 'Review and submit the evidence before the deadline.', link: `/jobs/${payment.job_id}`,
    email: chargebackTradeEmail({ amountPence: amount, jobId: payment.job_id, dueOn: dueAt ? new Date(dueAt).toLocaleDateString('en-GB') : null, reminder: false }),
    sms: smsChargeback(`${APP_URL}/jobs/${payment.job_id}`),
  })
}

/** A lost chargeback marks the stage unpaid again and counts on the client's record (PRD 9). */
export async function closeChargeback(admin: AdminClient, disputeId: string, outcome: 'won' | 'lost' | 'warning_closed'): Promise<void> {
  const { data: cb } = await admin.from('chargebacks').select('*').eq('stripe_dispute_id', disputeId).maybeSingle()
  if (!cb || cb.closed_at) return
  await admin.from('chargebacks').update({ outcome, closed_at: new Date().toISOString() }).eq('id', cb.id)
  await logJobEvent(admin, cb.job_id, 'chargeback_closed', `Card dispute ${outcome === 'won' ? 'won by the trade' : outcome === 'lost' ? 'lost: the payment was returned to the client' : 'closed'}`, null)
  if (outcome !== 'lost') return
  const { data: p } = await admin.from('payments').select('*').eq('id', cb.payment_id).maybeSingle()
  const payment = p as Payment | null
  if (!payment) return
  await admin.from('payments').update({ status: 'failed', client_disputed_at: new Date().toISOString() }).eq('id', payment.id)
  const { data: s } = await admin.from('payment_stages').select('*').eq('id', payment.stage_id).maybeSingle()
  const st = s as PaymentStage | null
  if (st) {
    const paid = Math.max(0, st.amount_paid_pence - payment.amount_pence)
    await admin.from('payment_stages').update({ amount_paid_pence: paid, status: paid > 0 ? 'part_paid' : st.requested_by_trade_at && !st.approved_at ? 'requested_by_trade' : 'approved', paid_at: null }).eq('id', st.id)
  }
  if (payment.invoice_id) {
    const { data: inv } = await admin.from('invoices').select('amount_paid_pence').eq('id', payment.invoice_id).maybeSingle()
    const paid = Math.max(0, ((inv?.amount_paid_pence as number | undefined) ?? 0) - payment.amount_pence)
    await admin.from('invoices').update({ amount_paid_pence: paid, status: paid > 0 ? 'part_paid' : 'issued', paid_at: null }).eq('id', payment.invoice_id)
  }
  await admin.from('jobs').update({ status: 'completed' }).eq('id', payment.job_id).eq('status', 'paid')
}

/** Daily: remind the trade 3 days before the evidence deadline. */
export async function runChargebackReminders(admin: AdminClient): Promise<number> {
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString()
  const { data } = await admin.from('chargebacks').select('*').is('evidence_submitted_at', null).is('closed_at', null).is('deadline_reminder_sent_at', null).lte('evidence_due_at', soon)
  for (const cb of data ?? []) {
    await admin.from('chargebacks').update({ deadline_reminder_sent_at: new Date().toISOString() }).eq('id', cb.id)
    await messageTrade(admin, { tradeUserId: cb.trade_id, type: 'payment', title: 'Chargeback evidence due in 3 days', body: '', link: `/jobs/${cb.job_id}`, email: chargebackTradeEmail({ amountPence: cb.amount_pence, jobId: cb.job_id, dueOn: cb.evidence_due_at ? new Date(cb.evidence_due_at).toLocaleDateString('en-GB') : null, reminder: true }), sms: smsChargeback(`${APP_URL}/jobs/${cb.job_id}`) })
  }
  return (data ?? []).length
}
