import type { PaymentMethod } from '@/types/v42'

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer_matched: 'bank transfer',
  bank_transfer_marked_by_trade: 'bank transfer',
  paid_elsewhere_cash: 'cash',
  paid_elsewhere_cheque: 'cheque',
  paid_elsewhere_other_account: 'transfer to another account',
  card: 'card',
  wallet: 'Apple Pay or Google Pay',
}

export const isPaidElsewhere = (m: PaymentMethod) => m.startsWith('paid_elsewhere')

/** Stage labels for both sides. "Requested by the trade" is never shown as approved (PRD 9). */
export function stageLabel(s: { status: string; approved_at: string | null; requested_by_trade_at: string | null; is_deposit: boolean }): string {
  const requestedOnly = !!s.requested_by_trade_at && !s.approved_at
  switch (s.status) {
    case 'upcoming': return 'Upcoming'
    case 'awaiting_approval': return 'Awaiting approval'
    case 'issue_raised': return 'Issue raised'
    case 'approved': return s.is_deposit ? 'Due' : 'Approved, due'
    case 'requested_by_trade': return 'Payment requested by the trade. Not approved by the client'
    case 'part_paid': return requestedOnly ? 'Part paid. Requested by the trade, not approved by the client' : 'Part paid'
    case 'paid': return requestedOnly ? 'Paid. Requested by the trade, not approved by the client' : 'Paid'
    case 'overdue': return requestedOnly ? 'Overdue. Requested by the trade, not approved by the client' : 'Overdue'
    case 'cancelled': return 'Cancelled'
    default: return s.status
  }
}
