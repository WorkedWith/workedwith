import type { Job } from '@/types/database'
import type { PaymentStage, Quote } from '@/types/v42'

export type DepositPosition = { outcome: 'none' | 'refund_due' | 'retained' | 'needs_trade_answer'; explanation: string }

/**
 * Where the deposit stands when a job is cancelled (PRD 9). Shown to both sides and recorded on the job.
 */
export function depositPosition(job: Pick<Job, 'materials_ordered_at' | 'started_at' | 'cancellation_period_ends_at' | 'client_type_at_acceptance' | 'made_to_measure_confirmed'>, quote: Pick<Quote, 'deposit_required' | 'deposit_refundable' | 'deposit_non_refundable_from'> | null, deposit: Pick<PaymentStage, 'amount_paid_pence'> | null, cancelledAt: Date): DepositPosition {
  if (!quote?.deposit_required || !deposit || deposit.amount_paid_pence <= 0) return { outcome: 'none', explanation: 'No deposit was paid.' }
  if (quote.deposit_refundable || !quote.deposit_non_refundable_from) return { outcome: 'refund_due', explanation: 'The deposit was refundable, so a refund is due.' }

  const from = quote.deposit_non_refundable_from
  const reachedAt = from === 'payment' ? 'payment' : from === 'materials_ordered' ? job.materials_ordered_at : job.started_at
  if (!reachedAt) {
    return { outcome: 'refund_due', explanation: from === 'materials_ordered' ? 'Materials had not been ordered, so the deposit is still refundable.' : 'Work had not started, so the deposit is still refundable.' }
  }
  const inCancellationPeriod = job.client_type_at_acceptance === 'person' && !!job.cancellation_period_ends_at && cancelledAt < new Date(job.cancellation_period_ends_at)
  if (inCancellationPeriod) {
    if (from === 'materials_ordered' && job.made_to_measure_confirmed === null) {
      return { outcome: 'needs_trade_answer', explanation: 'The client cancelled within their 14 day cancellation period. A refund is due unless the materials ordered were made to measure or made to order. The trade needs to confirm which applies.' }
    }
    if (from === 'materials_ordered' && job.made_to_measure_confirmed) {
      return { outcome: 'retained', explanation: 'Cancelled within the 14 day cancellation period, but the trade confirmed the materials ordered were made to measure or made to order, so the deposit is kept.' }
    }
    return { outcome: 'refund_due', explanation: 'Cancelled within the 14 day cancellation period, so the deposit is refundable.' }
  }
  const when = from === 'payment' ? 'from payment (company client)' : from === 'materials_ordered' ? `when materials were ordered on ${new Date(reachedAt).toLocaleDateString('en-GB')}` : `when work started on ${new Date(reachedAt).toLocaleDateString('en-GB')}`
  return { outcome: 'retained', explanation: `The deposit became non refundable ${when}, so the trade can keep it.` }
}

export function canRequestPaymentAnyway(stage: Pick<PaymentStage, 'status' | 'marked_done_at' | 'last_trade_response_at'>, issueOpenedAt: string | null, now = Date.now()): boolean {
  const days = (iso: string | null) => (iso ? (now - new Date(iso).getTime()) / 86_400_000 : 0)
  if (stage.status === 'awaiting_approval') return days(stage.marked_done_at) >= 14
  if (stage.status === 'issue_raised') return days(stage.last_trade_response_at ?? issueOpenedAt) >= 14
  return false
}
