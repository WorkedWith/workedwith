import { creds, day, expiresAt, jsonFetch, oauthToken } from './http'
import { pounds, type AccountingProvider, type Ctx } from './types'

// Xero Accounting API. TODO(keys): XERO_CLIENT_ID and XERO_CLIENT_SECRET from a Xero developer app, then
// test against the Xero demo company. Check the app partner tier for our connection count (PRD 19 item 2).
const API = 'https://api.xero.com/api.xro/2.0'
const h = (ctx: Ctx) => ({ token: ctx.tokens.access, extraHeaders: { 'xero-tenant-id': ctx.orgId ?? '' } })

export const xero: AccountingProvider = {
  platform: 'xero',
  label: 'Xero',
  authorisationUrl({ state, redirectUri }) {
    const u = new URL('https://login.xero.com/identity/connect/authorize')
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('client_id', creds('XERO').id)
    u.searchParams.set('redirect_uri', redirectUri)
    // Write transactions and contacts; settings read only to list accounts at set up
    u.searchParams.set('scope', 'openid profile email accounting.transactions accounting.contacts accounting.settings.read offline_access')
    u.searchParams.set('state', state)
    return u.toString()
  },
  async completeConnection({ code, redirectUri }) {
    const c = creds('XERO')
    const t = await oauthToken('https://identity.xero.com/connect/token', c.id, c.secret, { grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    const conns = await jsonFetch<{ tenantId: string; tenantName: string }[]>('https://api.xero.com/connections', { token: t.access_token })
    const tenant = conns[0]
    const ctx: Ctx = { tokens: { access: t.access_token, refresh: t.refresh_token, expiresAt: expiresAt(t.expires_in) }, orgId: tenant?.tenantId ?? null }
    const acc = await jsonFetch<{ Accounts: { AccountID: string; Code: string | null; Name: string; Type: string; Status: string }[] }>(`${API}/Accounts`, h(ctx))
    const active = acc.Accounts.filter(a => a.Status === 'ACTIVE')
    const sales = active.filter(a => a.Type === 'REVENUE' || a.Type === 'SALES').map(a => ({ id: a.Code ?? a.AccountID, code: a.Code, name: a.Name }))
    const bank = active.filter(a => a.Type === 'BANK').map(a => ({ id: a.AccountID, code: a.Code, name: a.Name }))
    return { tokens: ctx.tokens, orgId: ctx.orgId, orgName: tenant?.tenantName ?? null, salesAccounts: sales, bankAccounts: bank, defaultSales: sales.find(s => s.code === '200')?.id ?? sales[0]?.id ?? null, defaultBank: bank[0]?.id ?? null }
  },
  async refresh(tokens) {
    const c = creds('XERO')
    const t = await oauthToken('https://identity.xero.com/connect/token', c.id, c.secret, { grant_type: 'refresh_token', refresh_token: tokens.refresh })
    return { access: t.access_token, refresh: t.refresh_token, expiresAt: expiresAt(t.expires_in) }
  },
  async upsertContact(ctx, c) {
    // Match by name (Xero contact names are unique); create if missing
    const name = c.companyName ?? c.name
    const found = await jsonFetch<{ Contacts: { ContactID: string }[] }>(`${API}/Contacts?where=${encodeURIComponent(`Name=="${name.replace(/"/g, '')}"`)}`, h(ctx))
    if (found.Contacts[0]) return found.Contacts[0].ContactID
    const r = await jsonFetch<{ Contacts: { ContactID: string }[] }>(`${API}/Contacts`, { ...h(ctx), method: 'POST', body: JSON.stringify({ Contacts: [{ Name: name, EmailAddress: c.email ?? undefined, FirstName: c.companyName ? c.name : undefined }] }) })
    return r.Contacts[0].ContactID
  },
  async createInvoice(ctx, i) {
    const r = await jsonFetch<{ Invoices: { InvoiceID: string }[] }>(`${API}/Invoices`, {
      ...h(ctx), method: 'PUT',
      body: JSON.stringify({ Invoices: [{
        Type: 'ACCREC', Contact: { ContactID: i.contactExternalId }, InvoiceNumber: i.number, Date: day(i.issuedAt), DueDate: day(i.dueAt),
        LineAmountTypes: 'Exclusive', Status: 'AUTHORISED',
        LineItems: i.lines.map(l => ({ Description: l.description, Quantity: 1, UnitAmount: pounds(l.netPence), AccountCode: i.salesAccountCode, TaxType: i.vatRegistered && l.vatPence > 0 ? 'OUTPUT2' : 'NONE' })),
      }] }),
    })
    return r.Invoices[0].InvoiceID
  },
  async recordPayment(ctx, p) {
    const r = await jsonFetch<{ Payments: { PaymentID: string }[] }>(`${API}/Payments`, { ...h(ctx), method: 'PUT', body: JSON.stringify({ Payments: [{ Invoice: { InvoiceID: p.invoiceExternalId }, Account: { AccountID: p.bankAccountId }, Amount: pounds(p.amountPence), Date: day(p.paidAt), Reference: p.reference }] }) })
    // TODO(sandbox): record the Stripe fee as a bank charge (spend money) where the trade takes cards
    return r.Payments[0].PaymentID
  },
  async createCreditNote(ctx, c) {
    const r = await jsonFetch<{ CreditNotes: { CreditNoteID: string }[] }>(`${API}/CreditNotes`, {
      ...h(ctx), method: 'PUT',
      body: JSON.stringify({ CreditNotes: [{ Type: 'ACCRECCREDIT', Contact: { ContactID: c.contactExternalId }, CreditNoteNumber: c.number, Date: day(c.issuedAt), Status: 'AUTHORISED', LineAmountTypes: 'Exclusive', LineItems: [{ Description: c.reason, Quantity: 1, UnitAmount: pounds(c.netPence), AccountCode: c.salesAccountCode, TaxType: c.vatPence > 0 ? 'OUTPUT2' : 'NONE' }] }] }),
    })
    const id = r.CreditNotes[0].CreditNoteID
    // TODO(sandbox): allocate only when the invoice still has a balance; a refunded payment needs a refund instead
    await jsonFetch(`${API}/CreditNotes/${id}/Allocations`, { ...h(ctx), method: 'PUT', body: JSON.stringify({ Allocations: [{ Invoice: { InvoiceID: c.invoiceExternalId }, Amount: pounds(c.netPence + c.vatPence), Date: day(c.issuedAt) }] }) }).catch(() => undefined)
    return id
  },
  async recordRefund(ctx, r) {
    const res = await jsonFetch<{ Payments: { PaymentID: string }[] }>(`${API}/Payments`, { ...h(ctx), method: 'PUT', body: JSON.stringify({ Payments: [{ CreditNote: { CreditNoteID: r.creditNoteExternalId }, Account: { AccountID: r.bankAccountId }, Amount: pounds(r.amountPence), Date: day(r.paidAt) }] }) })
    return res.Payments[0].PaymentID
  },
  async disconnect(ctx) {
    // TODO(sandbox): DELETE https://api.xero.com/connections/{connectionId}
    void ctx
  },
}
