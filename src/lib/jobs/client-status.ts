import type { PaymentStage, Quote } from '@/types/v42'

/** What the client needs to do next, or what happens next (PRD 18 My jobs). */
export function nextStepForClient(jobStatus: string, quote: Pick<Quote, 'status' | 'deposit_required'> | null, stages: Pick<PaymentStage, 'status' | 'name' | 'is_deposit'>[]): string {
  if (jobStatus === 'cancelled') return 'Cancelled'
  if (jobStatus === 'paid') return 'Paid in full'
  if (quote && (quote.status === 'sent' || quote.status === 'viewed')) return 'Quote to look at'
  if (quote?.status === 'changes_requested') return 'Waiting for the updated quote'
  const toApprove = stages.find(s => s.status === 'awaiting_approval')
  if (toApprove) return `Approve: ${toApprove.name}`
  const due = stages.find(s => ['approved', 'requested_by_trade', 'part_paid', 'overdue'].includes(s.status))
  if (due) return due.is_deposit ? 'Deposit to pay' : `To pay: ${due.name}`
  if (jobStatus === 'booked') return 'Booked'
  if (jobStatus === 'in_progress') return 'Work in progress'
  return ''
}
