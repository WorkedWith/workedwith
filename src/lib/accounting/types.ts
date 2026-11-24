// The internal accounting interface (PRD 12, key rule 23). One adapter per platform.
// One way only: WorkedWith creates contacts, invoices, payments, credit notes and refunds. It never reads,
// changes or deletes anything else, except listing accounts once at set up so the trade can pick them.

export type Tokens = { access: string; refresh: string; expiresAt: string; tenantId?: string | null }

export type AccountOption = { id: string; code: string | null; name: string }

export type ConnectResult = {
  tokens: Tokens
  orgId: string | null
  orgName: string | null
  salesAccounts: AccountOption[]
  bankAccounts: AccountOption[]
  defaultSales: string | null
  defaultBank: string | null
}

export type ContactInput = { name: string; email: string | null; companyName: string | null }
export type InvoiceInput = {
  number: string
  issuedAt: string
  dueAt: string
  contactExternalId: string
  lines: { description: string; netPence: number; vatPence: number }[]
  salesAccountCode: string
  vatRegistered: boolean
}
export type PaymentInput = { invoiceExternalId: string; amountPence: number; paidAt: string; bankAccountId: string; reference: string; stripeFeePence?: number | null }
export type CreditNoteInput = { number: string; issuedAt: string; contactExternalId: string; invoiceExternalId: string; netPence: number; vatPence: number; reason: string; salesAccountCode: string }
export type RefundInput = { creditNoteExternalId: string; amountPence: number; paidAt: string; bankAccountId: string }

export type Ctx = { tokens: Tokens; orgId: string | null }

export interface AccountingProvider {
  readonly platform: 'xero' | 'quickbooks' | 'freeagent' | 'sage'
  readonly label: string
  authorisationUrl(p: { state: string; redirectUri: string }): string
  completeConnection(p: { code: string; redirectUri: string; realmId?: string | null }): Promise<ConnectResult>
  refresh(tokens: Tokens): Promise<Tokens>
  upsertContact(ctx: Ctx, c: ContactInput): Promise<string>
  createInvoice(ctx: Ctx, i: InvoiceInput): Promise<string>
  recordPayment(ctx: Ctx, p: PaymentInput): Promise<string>
  createCreditNote(ctx: Ctx, c: CreditNoteInput): Promise<string>
  recordRefund(ctx: Ctx, r: RefundInput): Promise<string | null>
  disconnect(ctx: Ctx): Promise<void>
}

export class TokenExpiredError extends Error {}

export const PLATFORM_LABEL: Record<AccountingProvider['platform'], string> = {
  xero: 'Xero',
  quickbooks: 'QuickBooks',
  freeagent: 'FreeAgent',
  sage: 'Sage Accounting',
}

export const pounds = (pence: number) => Math.round(pence) / 100
