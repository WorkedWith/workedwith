import { creds, day, expiresAt, jsonFetch, oauthToken } from './http'
import { pounds, type AccountingProvider, type Ctx } from './types'

// QuickBooks Online Accounting API. TODO(keys): QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET from an
// Intuit developer app; QUICKBOOKS_ENV=sandbox until certified. QuickBooks invoice lines need a product or
// service item: TODO(sandbox) create or find a "WorkedWith services" item pointing at the chosen income account.
const base = () => (process.env.QUICKBOOKS_ENV === 'live' ? 'https://quickbooks.api.intuit.com' : 'https://sandbox-quickbooks.api.intuit.com')
const TOKEN = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const url = (ctx: Ctx, path: string) => `${base()}/v3/company/${ctx.orgId}/${path}${path.includes('?') ? '&' : '?'}minorversion=70`
const esc = (s: string) => s.replace(/'/g, "\\'")

export const quickbooks: AccountingProvider = {
  platform: 'quickbooks',
  label: 'QuickBooks',
  authorisationUrl({ state, redirectUri }) {
    const u = new URL('https://appcenter.intuit.com/connect/oauth2')
    u.searchParams.set('client_id', creds('QUICKBOOKS').id)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('scope', 'com.intuit.quickbooks.accounting')
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('state', state)
    return u.toString()
  },
  async completeConnection({ code, redirectUri, realmId }) {
    const c = creds('QUICKBOOKS')
    const t = await oauthToken(TOKEN, c.id, c.secret, { grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    const ctx: Ctx = { tokens: { access: t.access_token, refresh: t.refresh_token, expiresAt: expiresAt(t.expires_in) }, orgId: realmId ?? null }
    const q = await jsonFetch<{ QueryResponse: { Account?: { Id: string; Name: string; AcctNum?: string; AccountType: string }[] } }>(url(ctx, `query?query=${encodeURIComponent("select * from Account where Active = true")}`), { token: ctx.tokens.access })
    const accounts = q.QueryResponse.Account ?? []
    const sales = accounts.filter(a => a.AccountType === 'Income').map(a => ({ id: a.Id, code: a.AcctNum ?? null, name: a.Name }))
    const bank = accounts.filter(a => a.AccountType === 'Bank').map(a => ({ id: a.Id, code: a.AcctNum ?? null, name: a.Name }))
    const info = await jsonFetch<{ CompanyInfo: { CompanyName: string } }>(url(ctx, `companyinfo/${ctx.orgId}`), { token: ctx.tokens.access }).catch(() => null)
    return { tokens: ctx.tokens, orgId: ctx.orgId, orgName: info?.CompanyInfo.CompanyName ?? null, salesAccounts: sales, bankAccounts: bank, defaultSales: sales[0]?.id ?? null, defaultBank: bank[0]?.id ?? null }
  },
  async refresh(tokens) {
    const c = creds('QUICKBOOKS')
    const t = await oauthToken(TOKEN, c.id, c.secret, { grant_type: 'refresh_token', refresh_token: tokens.refresh })
    return { access: t.access_token, refresh: t.refresh_token, expiresAt: expiresAt(t.expires_in) }
  },
  async upsertContact(ctx, c) {
    const name = c.companyName ?? c.name
    const q = await jsonFetch<{ QueryResponse: { Customer?: { Id: string }[] } }>(url(ctx, `query?query=${encodeURIComponent(`select Id from Customer where DisplayName = '${esc(name)}'`)}`), { token: ctx.tokens.access })
    if (q.QueryResponse.Customer?.[0]) return q.QueryResponse.Customer[0].Id
    const r = await jsonFetch<{ Customer: { Id: string } }>(url(ctx, 'customer'), { token: ctx.tokens.access, method: 'POST', body: JSON.stringify({ DisplayName: name, CompanyName: c.companyName ?? undefined, PrimaryEmailAddr: c.email ? { Address: c.email } : undefined }) })
    return r.Customer.Id
  },
  async createInvoice(ctx, i) {
    const r = await jsonFetch<{ Invoice: { Id: string } }>(url(ctx, 'invoice'), {
      token: ctx.tokens.access, method: 'POST',
      body: JSON.stringify({
        DocNumber: i.number, TxnDate: day(i.issuedAt), DueDate: day(i.dueAt), CustomerRef: { value: i.contactExternalId },
        // TODO(sandbox): ItemRef for the WorkedWith services item, and TaxCodeRef for UK VAT
        Line: i.lines.map(l => ({ DetailType: 'SalesItemLineDetail', Amount: pounds(l.netPence), Description: l.description, SalesItemLineDetail: { Qty: 1, UnitPrice: pounds(l.netPence) } })),
      }),
    })
    return r.Invoice.Id
  },
  async recordPayment(ctx, p) {
    const r = await jsonFetch<{ Payment: { Id: string } }>(url(ctx, 'payment'), {
      token: ctx.tokens.access, method: 'POST',
      // TODO(sandbox): CustomerRef is required; look it up from the invoice
      body: JSON.stringify({ TotalAmt: pounds(p.amountPence), TxnDate: day(p.paidAt), DepositToAccountRef: { value: p.bankAccountId }, PaymentRefNum: p.reference.slice(0, 21), Line: [{ Amount: pounds(p.amountPence), LinkedTxn: [{ TxnId: p.invoiceExternalId, TxnType: 'Invoice' }] }] }),
    })
    return r.Payment.Id
  },
  async createCreditNote(ctx, c) {
    const r = await jsonFetch<{ CreditMemo: { Id: string } }>(url(ctx, 'creditmemo'), {
      token: ctx.tokens.access, method: 'POST',
      body: JSON.stringify({ DocNumber: c.number, TxnDate: day(c.issuedAt), CustomerRef: { value: c.contactExternalId }, Line: [{ DetailType: 'SalesItemLineDetail', Amount: pounds(c.netPence), Description: c.reason, SalesItemLineDetail: { Qty: 1, UnitPrice: pounds(c.netPence) } }] }),
    })
    return r.CreditMemo.Id
  },
  async recordRefund(ctx, r) {
    // TODO(sandbox): RefundReceipt linked to the credit memo, from the chosen bank account
    void ctx
    void r
    return null
  },
  async disconnect(ctx) {
    await fetch('https://developer.api.intuit.com/v2/oauth2/tokens/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${creds('QUICKBOOKS').id}:${creds('QUICKBOOKS').secret}`).toString('base64')}` }, body: JSON.stringify({ token: ctx.tokens.refresh }) }).catch(() => undefined)
  },
}
