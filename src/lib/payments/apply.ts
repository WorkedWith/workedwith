import type { createAdminClient } from '@/lib/supabase/admin'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient, messageTrade } from '@/lib/messages/send'
import { paymentTradeEmail, receiptEmail } from '@/lib/email/templates-v42'
import { issueInvoiceForStage } from '@/lib/invoices/issue'
import { logJobEvent } from '@/lib/jobs/events'
import { openReviewWindow } from '@/lib/reviews/windows'
import { formatPence } from '@/lib/money'
import { depositWording } from '@/lib/quotes/wording'
import { METHOD_LABEL } from './labels'
import { onPaymentRecorded } from './hooks'
import type { Invoice, Payment, PaymentMethod, PaymentStage, Quote } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type RecordPaymentInput = {
  stageId: string
  amountPence: number
  method: PaymentMethod
  paidAt?: string
  bankMatchId?: string | null
  recordedBy?: string | null
  stripePaymentIntentId?: string | null
  stripeFeePence?: number | null
}

/**
 * The one place a payment is recorded (PRD 9). Updates the stage and its invoice, moves the job on
 * (deposit paid books it; everything paid makes it paid and opens reviews), stops chasing by changing the
 * stage status, and sends the receipt and the trade notification.
 */
export async function recordPayment(admin: AdminClient, input: RecordPaymentInput): Promise<{ ok: true; payment: Payment } | { ok: false; error: string }> {
  const { data: s } = await admin.from('payment_stages').select('*').eq('id', input.stageId).maybeSingle()
  const stage = s as PaymentStage | null
  if (!stage) return { ok: false, error: 'Stage not found.' }
  if (input.amountPence <= 0) return { ok: false, error: 'Enter an amount.' }
  const { data: jobRow } = await admin.from('jobs').select('id, title, status, trade_user_id, client_user_id, current_quote_id, client_type_at_acceptance').eq('id', stage.job_id).maybeSingle()
  if (!jobRow?.trade_user_id) return { ok: false, error: 'Job not found.' }

  let invoice: Invoice | null = null
  const { data: inv } = await admin.from('invoices').select('*').eq('stage_id', stage.id).neq('status', 'credited').maybeSingle()
  invoice = (inv as Invoice | null) ?? (await issueInvoiceForStage(admin, stage.id))

  const paidAt = input.paidAt ?? new Date().toISOString()
  const { data: p, error } = await admin.from('payments').insert({
    stage_id: stage.id,
    invoice_id: invoice?.id ?? null,
    job_id: stage.job_id,
    amount_pence: Math.round(input.amountPence),
    method: input.method,
    bank_match_id: input.bankMatchId ?? null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    stripe_fee_pence: input.stripeFeePence ?? null,
    status: 'paid',
    paid_at: paidAt,
    recorded_by: input.recordedBy ?? null,
  }).select('*').single()
  if (error || !p) return { ok: false, error: 'We could not record the payment.' }
  const payment = p as Payment

  const newPaid = stage.amount_paid_pence + payment.amount_pence
  const full = newPaid >= stage.amount_pence
  await admin.from('payment_stages').update({
    amount_paid_pence: newPaid,
    status: full ? 'paid' : 'part_paid',
    paid_at: full ? paidAt : null,
    client_says_paid_at: null,
  }).eq('id', stage.id)
  if (invoice) {
    const invPaid = invoice.amount_paid_pence + payment.amount_pence
    await admin.from('invoices').update({
      amount_paid_pence: invPaid,
      status: invPaid >= invoice.total_pence ? 'paid' : 'part_paid',
      paid_at: invPaid >= invoice.total_pence ? paidAt : null,
    }).eq('id', invoice.id)
  }

  await logJobEvent(admin, stage.job_id, 'payment', `${formatPence(payment.amount_pence)} received for ${stage.name} by ${METHOD_LABEL[payment.method]}`, input.recordedBy ?? null, { paymentId: payment.id, method: payment.method })

  // Job transitions
  const { data: q } = await admin.from('quotes').select('*').eq('id', jobRow.current_quote_id as string).maybeSingle()
  const quote = q as Quote | null
  if (stage.is_deposit && full && jobRow.status === 'quoted' && quote?.status === 'accepted') {
    await admin.from('jobs').update({ status: 'booked', booked_at: paidAt }).eq('id', stage.job_id)
    await logJobEvent(admin, stage.job_id, 'booked', 'Deposit paid. Job booked.', null)
  }
  const { data: all } = await admin.from('payment_stages').select('status').eq('job_id', stage.job_id)
  const live = (all ?? []).filter(x => x.status !== 'cancelled')
  if (live.length > 0 && live.every(x => x.status === 'paid') && !['cancelled', 'paid', 'quoted', 'booked'].includes(jobRow.status as string)) {
    await admin.from('jobs').update({ status: 'paid' }).eq('id', stage.job_id)
    await logJobEvent(admin, stage.job_id, 'paid', 'Job paid in full', null)
    await openReviewWindow(admin, stage.job_id, 'paid')
  }

  // Receipt to the client, notification to the trade (PRD 9 receipts)
  const balance = Math.max(0, stage.amount_pence - newPaid)
  if (jobRow.client_user_id) {
    const sender = await getTradeSender(admin, jobRow.trade_user_id)
    const link = await createAccessLink(admin, { clientUserId: jobRow.client_user_id, purpose: 'job', targetPath: `/my/jobs/${stage.job_id}`, createdBy: jobRow.trade_user_id })
    const depositNote = stage.is_deposit && quote
      ? depositWording({ amountPence: quote.deposit_amount_pence, for: quote.deposit_for, refundable: quote.deposit_refundable, nonRefundableFrom: quote.deposit_non_refundable_from, clientKind: (jobRow.client_type_at_acceptance as 'person' | 'company' | null) ?? 'person' })
      : null
    await messageClient(admin, {
      tradeUserId: jobRow.trade_user_id, clientUserId: jobRow.client_user_id,
      email: receiptEmail({ business: sender.businessName, invoiceNumber: invoice?.invoice_number ?? '', amountPence: payment.amount_pence, balancePence: balance, method: METHOD_LABEL[payment.method], link, depositNote }),
    })
  }
  if (input.method !== 'bank_transfer_marked_by_trade' && !input.method.startsWith('paid_elsewhere')) {
    const { data: cu } = await admin.from('users').select('full_name').eq('id', jobRow.client_user_id as string).maybeSingle()
    await messageTrade(admin, {
      tradeUserId: jobRow.trade_user_id, type: 'payment',
      title: full ? `Paid: ${invoice?.invoice_number ?? stage.name}` : `Part payment: ${invoice?.invoice_number ?? stage.name}`,
      body: `${formatPence(payment.amount_pence)} received.`, link: `/jobs/${stage.job_id}`,
      email: paymentTradeEmail({ client: (cu?.full_name as string | undefined) ?? 'Your client', amountPence: payment.amount_pence, invoiceNumber: invoice?.invoice_number ?? '', jobId: stage.job_id, event: full ? 'received' : 'part' }),
    })
  }
  await onPaymentRecorded(admin, payment)
  return { ok: true, payment }
}

/** When every stage that is not cancelled has been approved or requested, the job is complete (PRD 9). */
export async function refreshCompletion(admin: AdminClient, jobId: string): Promise<void> {
  const { data: job } = await admin.from('jobs').select('status').eq('id', jobId).maybeSingle()
  if (!job || job.status !== 'in_progress') return
  const { data: all } = await admin.from('payment_stages').select('status').eq('job_id', jobId)
  const live = (all ?? []).filter(x => x.status !== 'cancelled')
  const done = live.length > 0 && live.every(x => !['upcoming', 'awaiting_approval', 'issue_raised'].includes(x.status as string))
  if (!done) return
  const allPaid = live.every(x => x.status === 'paid')
  await admin.from('jobs').update({ status: allPaid ? 'paid' : 'completed', completed_at: new Date().toISOString() }).eq('id', jobId)
  if (allPaid) await openReviewWindow(admin, jobId, 'paid')
}
