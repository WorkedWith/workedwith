import { creds, day, expiresAt, jsonFetch, oauthToken } from './http'
import { pounds, type AccountingProvider, type Ctx } from './types'

// FreeAgent API v2. TODO(keys): FREEAGENT_CLIENT_ID and FREEAGENT_CLIENT_SECRET; FREEAGENT_ENV=sandbox
// uses api.sandbox.freeagent.com. FreeAgent records payments as bank transaction explanations.
const base = () => (process.env.FREEAGENT_ENV === 'live' ? 'https://api.freeagent.com/v2' : 'https://api.sandbox.freeagent.com/v2')
const opt = (ctx: Ctx) => ({ token: ctx.tokens.access })

export const freeagent: AccountingProvider = {
  platform: 'freeagent',
  label: 'FreeAgent',
  authorisationUrl({ state, redirectUri }) {
    const u = new URL(`${base()}/approve_app`)
    u.searchParams.set('client_id', creds('FREEAGENT').id)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('state', state)
    return u.toString()
  },
  async completeConnection({ code, redirectUri }) {
    const c = creds('FREEAGENT')
    const t = await oauthToken(`${base()}/token_endpoint`, c.id, c.secret, { grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    const ctx: Ctx = { tokens: { access: t.access_token, refresh: t.refresh_token, expiresAt: expiresAt(t.expires_in) }, orgId: null }
    const company = await jsonFetch<{ company: { name: string; url: string } }>(`${base()}/company`, opt(ctx))
    const banks = await jsonFetch<{ bank_accounts: { url: string; name: string }[] }>(`${base()}/bank_accounts`, opt(ctx))
    const cats = await jsonFetch<{ income_categories?: { url: string; description: string; nominal_code: string }[] }>(`${base()}/categories`, opt(ctx))
    const sales = (cats.income_categories ?? []).map(x => ({ id: x.url, code: x.nominal_code, name: x.description }))
    const bank = banks.bank_accounts.map(b => ({ id: b.url, code: null, name: b.name }))
    return { tokens: ctx.tokens, orgId: company.company.url, orgName: company.company.name, salesAccounts: sales, bankAccounts: bank, defaultSales: sales.find(s => s.code === '001')?.id ?? sales[0]?.id ?? null, defaultBank: bank[0]?.id ?? null }
  },
  async refresh(tokens) {
    const c = creds('FREEAGENT')
    const t = await oauthToken(`${base()}/token_endpoint`, c.id, c.secret, { grant_type: 'refresh_token', refresh_token: tokens.refresh })
    return { access: t.access_token, refresh: t.refresh_token, expiresAt: expiresAt(t.expires_in) }
  },
  async upsertContact(ctx, c) {
    const r = await jsonFetch<{ contact: { url: string } }>(`${base()}/contacts`, { ...opt(ctx), method: 'POST', body: JSON.stringify({ contact: { organisation_name: c.companyName ?? undefined, first_name: c.name.split(' ')[0], last_name: c.name.split(' ').slice(1).join(' ') || c.name, email: c.email ?? undefined } }) })
    return r.contact.url
  },
  async createInvoice(ctx, i) {
    const days = Math.max(0, Math.round((new Date(i.dueAt).getTime() - new Date(i.issuedAt).getTime()) / 86_400_000))
    const r = await jsonFetch<{ invoice: { url: string } }>(`${base()}/invoices`, {
      ...opt(ctx), method: 'POST',
      body: JSON.stringify({ invoice: { contact: i.contactExternalId, dated_on: day(i.issuedAt), payment_terms_in_days: days, reference: i.number, invoice_items: i.lines.map(l => ({ description: l.description, price: pounds(l.netPence), quantity: 1, item_type: 'Services', category: i.salesAccountCode, sales_tax_rate: i.vatRegistered && l.vatPence > 0 ? 20 : 0 })) } }),
    })
    await jsonFetch(`${r.invoice.url}/transitions/mark_as_sent`, { ...opt(ctx), method: 'PUT' }).catch(() => undefined)
    return r.invoice.url
  },
  async recordPayment(ctx, p) {
    const r = await jsonFetch<{ bank_transaction_explanation: { url: string } }>(`${base()}/bank_transaction_explanations`, { ...opt(ctx), method: 'POST', body: JSON.stringify({ bank_transaction_explanation: { bank_account: p.bankAccountId, dated_on: day(p.paidAt), paid_invoice: p.invoiceExternalId, gross_value: pounds(p.amountPence), description: p.reference } }) })
    return r.bank_transaction_explanation.url
  },
  async createCreditNote(ctx, c) {
    const r = await jsonFetch<{ credit_note: { url: string } }>(`${base()}/credit_notes`, { ...opt(ctx), method: 'POST', body: JSON.stringify({ credit_note: { contact: c.contactExternalId, dated_on: day(c.issuedAt), reference: c.number, credit_note_items: [{ description: c.reason, price: pounds(c.netPence), quantity: 1, item_type: 'Services', category: c.salesAccountCode, sales_tax_rate: c.vatPence > 0 ? 20 : 0 }] } }) })
    return r.credit_note.url
  },
  async recordRefund(ctx, r) {
    // TODO(sandbox): a negative bank transaction explanation against the credit note
    void ctx
    void r
    return null
  },
  async disconnect() { /* FreeAgent has no revoke endpoint; the trade removes access in FreeAgent settings */ },
}
