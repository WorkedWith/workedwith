import { creds, day, expiresAt, jsonFetch, oauthToken } from './http'
import { pounds, type AccountingProvider, type Ctx } from './types'

// Sage Business Cloud Accounting API v3.1 (UK). TODO(keys): SAGE_CLIENT_ID and SAGE_CLIENT_SECRET from a Sage
// developer app; test with a Sage trial business. Tax rate ids come from /tax_rates (GB_STANDARD, GB_NO_TAX).
const API = 'https://api.accounting.sage.com/v3.1'
const opt = (ctx: Ctx): { token: string; extraHeaders: Record<string, string> } => ({ token: ctx.tokens.access, extraHeaders: ctx.orgId ? { 'X-Business': ctx.orgId } : {} })

export const sage: AccountingProvider = {
  platform: 'sage',
  label: 'Sage Accounting',
  authorisationUrl({ state, redirectUri }) {
    const u = new URL('https://www.sageone.com/oauth2/auth/central')
    u.searchParams.set('filter', 'apiv3.1')
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('client_id', creds('SAGE').id)
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('scope', 'full_access')
    u.searchParams.set('state', state)
    return u.toString()
  },
  async completeConnection({ code, redirectUri }) {
    const c = creds('SAGE')
    const t = await oauthToken('https://oauth.accounting.sage.com/token', c.id, c.secret, { grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    const ctx: Ctx = { tokens: { access: t.access_token, refresh: t.refresh_token, expiresAt: expiresAt(t.expires_in) }, orgId: null }
    const biz = await jsonFetch<{ id: string; name: string }[]>(`${API}/businesses`, opt(ctx))
    ctx.orgId = biz[0]?.id ?? null
    const ledgers = await jsonFetch<{ $items: { id: string; displayed_as: string; nominal_code?: string; ledger_account_type?: { id: string } }[] }>(`${API}/ledger_accounts?items_per_page=200`, opt(ctx))
    const banks = await jsonFetch<{ $items: { id: string; displayed_as: string }[] }>(`${API}/bank_accounts`, opt(ctx))
    const sales = ledgers.$items.filter(l => l.ledger_account_type?.id === 'SALES').map(l => ({ id: l.id, code: l.nominal_code ?? null, name: l.displayed_as }))
    const bank = banks.$items.map(b => ({ id: b.id, code: null, name: b.displayed_as }))
    return { tokens: ctx.tokens, orgId: ctx.orgId, orgName: biz[0]?.name ?? null, salesAccounts: sales, bankAccounts: bank, defaultSales: sales.find(s => s.code === '4000')?.id ?? sales[0]?.id ?? null, defaultBank: bank[0]?.id ?? null }
  },
  async refresh(tokens) {
    const c = creds('SAGE')
    const t = await oauthToken('https://oauth.accounting.sage.com/token', c.id, c.secret, { grant_type: 'refresh_token', refresh_token: tokens.refresh })
    return { access: t.access_token, refresh: t.refresh_token, expiresAt: expiresAt(t.expires_in) }
  },
  async upsertContact(ctx, c) {
    const r = await jsonFetch<{ id: string }>(`${API}/contacts`, { ...opt(ctx), method: 'POST', body: JSON.stringify({ contact: { name: c.companyName ?? c.name, contact_type_ids: ['CUSTOMER'], email: c.email ?? undefined } }) })
    return r.id
  },
  async createInvoice(ctx, i) {
    const r = await jsonFetch<{ id: string }>(`${API}/sales_invoices`, {
      ...opt(ctx), method: 'POST',
      body: JSON.stringify({ sales_invoice: { contact_id: i.contactExternalId, date: day(i.issuedAt), due_date: day(i.dueAt), reference: i.number, invoice_lines: i.lines.map(l => ({ description: l.description, ledger_account_id: i.salesAccountCode, quantity: 1, unit_price: pounds(l.netPence), tax_rate_id: i.vatRegistered && l.vatPence > 0 ? 'GB_STANDARD' : 'GB_NO_TAX' })) } }),
    })
    return r.id
  },
  async recordPayment(ctx, p) {
    const r = await jsonFetch<{ id: string }>(`${API}/contact_payments`, {
      ...opt(ctx), method: 'POST',
      // TODO(sandbox): contact_id is required; look it up from the invoice
      body: JSON.stringify({ contact_payment: { transaction_type_id: 'CUSTOMER_RECEIPT', bank_account_id: p.bankAccountId, date: day(p.paidAt), total_amount: pounds(p.amountPence), reference: p.reference, allocated_artefacts: [{ artefact_id: p.invoiceExternalId, amount: pounds(p.amountPence) }] } }),
    })
    return r.id
  },
  async createCreditNote(ctx, c) {
    const r = await jsonFetch<{ id: string }>(`${API}/sales_credit_notes`, { ...opt(ctx), method: 'POST', body: JSON.stringify({ sales_credit_note: { contact_id: c.contactExternalId, date: day(c.issuedAt), reference: c.number, original_invoice_id: c.invoiceExternalId, credit_note_lines: [{ description: c.reason, ledger_account_id: c.salesAccountCode, quantity: 1, unit_price: pounds(c.netPence), tax_rate_id: c.vatPence > 0 ? 'GB_STANDARD' : 'GB_NO_TAX' }] } }) })
    return r.id
  },
  async recordRefund(ctx, r) {
    // TODO(sandbox): contact_payments with transaction_type_id CUSTOMER_REFUND allocated to the credit note
    void ctx
    void r
    return null
  },
  async disconnect() { /* The trade removes the app in Sage; Sage has no token revoke for this flow */ },
}
