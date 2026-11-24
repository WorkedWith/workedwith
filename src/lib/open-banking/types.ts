// The internal open banking interface (key rule 23). Account information only: WorkedWith reads incoming
// payments on the trade's own account so invoices can mark themselves paid. It never starts payments.

import type { CopResult } from '@/types/v42'

export type CopInput = { accountName: string; sortCode: string; accountNumber: string }
export type CopOutcome = { result: CopResult; matchedName: string | null }

export type ConnectionResult = {
  /** Opaque credentials for later calls (for example a refresh token). Stored encrypted. */
  connectionSecret: string
  bankName: string
  consentExpiresAt: Date
  /** The accounts the trade shared, so we can check the connected account is the one on their invoices */
  accounts: { sortCode: string | null; accountNumberLast4: string | null }[]
}

/** One incoming payment as the provider reports it. Never stored unless it matches an invoice. */
export type IncomingPayment = {
  providerTransactionId: string
  receivedAt: Date
  amountPence: number
  payerName: string | null
  reference: string | null
}

export interface OpenBankingProvider {
  readonly id: string
  readonly label: string
  /** Confirmation of Payee: does the account name match what the bank holds? */
  confirmationOfPayee(input: CopInput): Promise<CopOutcome>
  /** Where to send the trade to pick their bank and approve read access */
  authorisationUrl(input: { state: string; redirectUri: string }): Promise<string>
  /** Called on return from the bank */
  completeConnection(input: { code: string; redirectUri: string }): Promise<ConnectionResult>
  /** Credits on the connected account since a date */
  listIncomingPayments(input: { connectionSecret: string; since: Date }): Promise<{ payments: IncomingPayment[]; connectionSecret?: string }>
  /** Revoke our access (account closed, or the trade disconnects) */
  revoke(input: { connectionSecret: string }): Promise<void>
}

/** Every connection must be reconfirmed by the trade every 90 days (PRD 9). */
export const CONSENT_DAYS = 90
