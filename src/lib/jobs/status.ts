import type { Job } from '@/types/database'
import type { PaymentStage, Quote, QuoteStatus } from '@/types/v42'

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  changes_requested: 'Changes asked for',
  declined: 'Declined',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
  superseded: 'Replaced by a newer version',
}

export const JOB_STATUS_LABEL: Record<string, string> = {
  quoted: 'Quote',
  booked: 'Booked',
  in_progress: 'In progress',
  completed: 'Awaiting payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
}

export type JobFilter = 'all' | 'quotes' | 'booked' | 'in_progress' | 'awaiting_payment' | 'paid'

export function jobFilterOf(job: Pick<Job, 'status'>, stages: Pick<PaymentStage, 'status'>[]): JobFilter {
  if (job.status === 'quoted') return 'quotes'
  if (job.status === 'paid') return 'paid'
  const due = stages.some(s => ['approved', 'requested_by_trade', 'part_paid', 'overdue'].includes(s.status))
  if (job.status === 'completed' || due) return 'awaiting_payment'
  if (job.status === 'in_progress') return 'in_progress'
  if (job.status === 'booked') return 'booked'
  return 'all'
}

/** The next thing that needs to happen, from the trade's side (PRD 18 Jobs). */
export function nextStepForTrade(job: Pick<Job, 'status' | 'agreed_start_date' | 'started_at'>, quote: Pick<Quote, 'status' | 'deposit_required'> | null, stages: Pick<PaymentStage, 'status' | 'is_deposit' | 'name'>[]): string {
  if (job.status === 'cancelled') return 'Cancelled'
  if (job.status === 'paid') return 'Paid in full'
  if (!quote) return 'Finish the quote'
  if (job.status === 'quoted') {
    switch (quote.status) {
      case 'draft': return 'Finish and send the quote'
      case 'sent': return 'Waiting for the client to open it'
      case 'viewed': return 'Waiting for the client to accept'
      case 'changes_requested': return 'Client asked for changes'
      case 'accepted': return quote.deposit_required ? 'Waiting for the deposit' : 'Booked'
      case 'declined': return 'Declined by the client'
      case 'expired': return 'Quote expired'
      case 'withdrawn': return 'Quote withdrawn'
      default: return 'Quote replaced'
    }
  }
  const awaiting = stages.find(s => s.status === 'awaiting_approval')
  if (awaiting) return `Waiting for approval: ${awaiting.name}`
  const issue = stages.find(s => s.status === 'issue_raised')
  if (issue) return `Issue raised: ${issue.name}`
  const due = stages.find(s => ['approved', 'requested_by_trade', 'part_paid', 'overdue'].includes(s.status))
  if (due) return `Payment due: ${due.name}`
  if (job.status === 'booked' && !job.agreed_start_date) return 'Agree a start date'
  if (job.status === 'booked') return 'Mark the job started'
  const next = stages.find(s => s.status === 'upcoming' && !s.is_deposit)
  if (next) return `Next: mark ${next.name} done`
  return 'In progress'
}

export function plannedStartShort(type: string | null | undefined, date: string | null | undefined, agreed: string | null | undefined): string {
  const d = agreed ?? (type === 'date' ? date : null)
  if (d) return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (type === 'asap') return 'As soon as possible'
  return 'To be agreed'
}
