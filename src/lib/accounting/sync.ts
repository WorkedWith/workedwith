import type { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from '@/lib/crypto/secret-box'
import { hasActivePlan } from '@/lib/plan'
import { messageTrade } from '@/lib/messages/send'
import { loadInvoiceDoc } from '@/lib/invoices/document'
import { splitGross } from '@/lib/quotes/calc'
import { accountingProvider, PLATFORM_LABEL } from './index'
import { TokenExpiredError, type Ctx, type Tokens } from './types'
import type { AccountingConnection, AccountingSyncItem, CreditNote, Payment, SyncEntity } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

const RETRY_WINDOW_MS = 24 * 3_600_000
const BACKOFF_MIN = [5, 15, 60, 180, 360]

async function connectionFor(admin: AdminClient, tradeId: string): Promise<AccountingConnection | null> {
  const { data } = await admin.from('accounting_connections').select('*').eq('trade_id', tradeId).maybeSingle()
  return (data as AccountingConnection | null) ?? null
}

/** Queue a record for the trade's accounting software, and try straight away. Never throws (PRD 12). */
export async function enqueueSync(admin: AdminClient, tradeId: string, entityType: SyncEntity, entityId: string, entityDate: string): Promise<void> {
  try {
    const conn = await connectionFor(admin, tradeId)
    if (!conn || conn.status === 'revoked' || conn.status === 'setup') return
    if (conn.sync_from && entityDate.slice(0, 10) < conn.sync_from) return
    const { data: item } = await admin.from('accounting_sync_items').upsert(
      { connection_id: conn.id, trade_id: tradeId, entity_type: entityType, entity_id: entityId, status: 'pending', next_attempt_at: new Date().toISOString() },
      { onConflict: 'connection_id,entity_type,entity_id', ignoreDuplicates: true },
    ).select('*').maybeSingle()
    if (item && conn.status === 'connected') await processItem(admin, conn, item as AccountingSyncItem)
  } catch (err) {
    console.error('Accounting enqueue failed (non-fatal):', err)
  }
}

async function ctxFor(admin: AdminClient, conn: AccountingConnection): Promise<Ctx> {
  if (!conn.tokens_encrypted) throw new TokenExpiredError('No tokens')
  let tokens = JSON.parse(decryptSecret(conn.tokens_encrypted)) as Tokens
  if (new Date(tokens.expiresAt).getTime() < Date.now() + 5 * 60_000) {
    tokens = await accountingProvider(conn.platform).refresh(tokens)
    await admin.from('accounting_connections').update({ tokens_encrypted: encryptSecret(JSON.stringify(tokens)), token_expires_at: tokens.expiresAt }).eq('id', conn.id)
  }
  return { tokens, orgId: conn.external_org_id }
}

async function externalId(admin: AdminClient, connId: string, type: SyncEntity, entityId: string): Promise<string | null> {
  const { data } = await admin.from('accounting_sync_items').select('external_id, status').eq('connection_id', connId).eq('entity_type', type).eq('entity_id', entityId).maybeSingle()
  return data?.status === 'synced' ? ((data.external_id as string | null) ?? null) : null
}

class NotReady extends Error {}

async function pushInvoice(admin: AdminClient, conn: AccountingConnection, ctx: Ctx, invoiceId: string): Promise<string> {
  const p = accountingProvider(conn.platform)
  const doc = await loadInvoiceDoc(admin, invoiceId)
  if (!doc) throw new Error('Invoice not found')
  const { data: job } = await admin.from('jobs').select('client_user_id').eq('id', doc.invoice.job_id).maybeSingle()
  const clientId = job?.client_user_id as string
  let contact = await externalId(admin, conn.id, 'contact', clientId)
  if (!contact) {
    const { data: u } = await admin.from('users').select('email').eq('id', clientId).maybeSingle()
    contact = await p.upsertContact(ctx, { name: doc.client.name, email: (u?.email as string | null) ?? null, companyName: doc.client.company })
    await admin.from('accounting_sync_items').upsert({ connection_id: conn.id, trade_id: conn.trade_id, entity_type: 'contact', entity_id: clientId, external_id: contact, status: 'synced', synced_at: new Date().toISOString() }, { onConflict: 'connection_id,entity_type,entity_id' })
  }
  const inv = doc.invoice
  const lines = doc.lines.map(l => {
    const s = splitGross(l.amountPence, inv.net_pence, inv.vat_pence)
    return { description: l.description, netPence: s.net, vatPence: s.vat }
  })
  return p.createInvoice(ctx, { number: inv.invoice_number, issuedAt: inv.issued_at, dueAt: inv.due_at, contactExternalId: contact, lines, salesAccountCode: conn.sales_account_code ?? '', vatRegistered: !!doc.trade.vatNumber })
}

async function processItem(admin: AdminClient, conn: AccountingConnection, item: AccountingSyncItem): Promise<void> {
  if (item.status === 'synced') return
  const p = accountingProvider(conn.platform)
  try {
    const ctx = await ctxFor(admin, conn)
    let ext: string | null = null
    if (item.entity_type === 'invoice') {
      ext = await pushInvoice(admin, conn, ctx, item.entity_id)
    } else if (item.entity_type === 'payment') {
      const { data } = await admin.from('payments').select('*').eq('id', item.entity_id).maybeSingle()
      const pay = data as Payment | null
      if (!pay?.invoice_id) throw new Error('Payment has no invoice')
      // Paid elsewhere only syncs once the client confirms it (PRD 12)
      if (pay.method.startsWith('paid_elsewhere') && !pay.client_confirmed_at) throw new NotReady()
      const invExt = await externalId(admin, conn.id, 'invoice', pay.invoice_id)
      if (!invExt) throw new NotReady()
      const { data: inv } = await admin.from('invoices').select('invoice_number').eq('id', pay.invoice_id).maybeSingle()
      ext = await p.recordPayment(ctx, { invoiceExternalId: invExt, amountPence: pay.amount_pence, paidAt: pay.paid_at, bankAccountId: conn.payment_account_id ?? '', reference: (inv?.invoice_number as string | undefined) ?? '', stripeFeePence: pay.stripe_fee_pence })
    } else if (item.entity_type === 'credit_note') {
      const { data } = await admin.from('credit_notes').select('*').eq('id', item.entity_id).maybeSingle()
      const cn = data as CreditNote | null
      if (!cn) throw new Error('Credit note not found')
      const invExt = await externalId(admin, conn.id, 'invoice', cn.invoice_id)
      const { data: job } = await admin.from('jobs').select('client_user_id').eq('id', cn.job_id).maybeSingle()
      const contact = await externalId(admin, conn.id, 'contact', job?.client_user_id as string)
      if (!invExt || !contact) throw new NotReady()
      ext = await p.createCreditNote(ctx, { number: cn.credit_note_number, issuedAt: cn.issued_at, contactExternalId: contact, invoiceExternalId: invExt, netPence: cn.net_pence, vatPence: cn.vat_pence, reason: cn.reason, salesAccountCode: conn.sales_account_code ?? '' })
    } else if (item.entity_type === 'refund') {
      const { data: cn } = await admin.from('credit_notes').select('id, amount_pence, issued_at').eq('payment_id', item.entity_id).order('issued_at', { ascending: false }).limit(1).maybeSingle()
      if (!cn) throw new NotReady()
      const cnExt = await externalId(admin, conn.id, 'credit_note', cn.id as string)
      if (!cnExt) throw new NotReady()
      ext = await p.recordRefund(ctx, { creditNoteExternalId: cnExt, amountPence: cn.amount_pence as number, paidAt: cn.issued_at as string, bankAccountId: conn.payment_account_id ?? '' })
    }
    await admin.from('accounting_sync_items').update({ status: 'synced', external_id: ext, synced_at: new Date().toISOString(), last_error: null }).eq('id', item.id)
  } catch (err) {
    if (err instanceof NotReady) {
      await admin.from('accounting_sync_items').update({ next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString() }).eq('id', item.id)
      return
    }
    if (err instanceof TokenExpiredError) {
      await markExpired(admin, conn)
      return
    }
    const first = item.first_attempt_at ?? new Date().toISOString()
    const attempts = item.attempts + 1
    const failed = Date.now() - new Date(first).getTime() > RETRY_WINDOW_MS
    await admin.from('accounting_sync_items').update({
      attempts, first_attempt_at: first, last_error: err instanceof Error ? err.message.slice(0, 500) : 'Sync failed',
      status: failed ? 'failed' : 'pending',
      next_attempt_at: new Date(Date.now() + BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)] * 60_000).toISOString(),
    }).eq('id', item.id)
    if (failed) {
      await messageTrade(admin, { tradeUserId: conn.trade_id, type: 'connection', title: `${PLATFORM_LABEL[conn.platform]} sync failed`, body: 'A record could not be sent. It never affects the job or the payment. Retry from your home page.', link: '/dashboard' })
    }
  }
}

async function markExpired(admin: AdminClient, conn: AccountingConnection): Promise<void> {
  await admin.from('accounting_connections').update({ status: 'expired', expired_notified_at: new Date().toISOString() }).eq('id', conn.id)
  if (!conn.expired_notified_at || conn.status !== 'expired') {
    await messageTrade(admin, { tradeUserId: conn.trade_id, type: 'connection', title: `Reconnect ${PLATFORM_LABEL[conn.platform]}`, body: 'Your accounting connection has expired, so sync is paused. Anything missed is sent once you reconnect.', link: '/profile/getting-paid' })
  }
}

/** Process due items. Paused for trades whose trial or plan has ended, and for expired connections. */
export async function runAccountingSync(admin: AdminClient, onlyTradeId?: string): Promise<{ processed: number }> {
  let q = admin.from('accounting_sync_items').select('*').eq('status', 'pending').lte('next_attempt_at', new Date().toISOString()).order('created_at').limit(300)
  if (onlyTradeId) q = q.eq('trade_id', onlyTradeId)
  const { data } = await q
  const conns = new Map<string, AccountingConnection | null>()
  const planOk = new Map<string, boolean>()
  let processed = 0
  // Invoices before payments and credit notes, so dependencies are in place
  const order: SyncEntity[] = ['contact', 'invoice', 'payment', 'credit_note', 'refund']
  const items = ((data ?? []) as AccountingSyncItem[]).sort((a, b) => order.indexOf(a.entity_type) - order.indexOf(b.entity_type))
  for (const item of items) {
    if (!conns.has(item.trade_id)) conns.set(item.trade_id, await connectionFor(admin, item.trade_id))
    const conn = conns.get(item.trade_id)
    if (!conn || conn.status !== 'connected' || conn.id !== item.connection_id) continue
    if (!planOk.has(item.trade_id)) planOk.set(item.trade_id, await hasActivePlan(item.trade_id, admin))
    if (!planOk.get(item.trade_id)) continue
    await processItem(admin, conn, item)
    processed++
  }
  return { processed }
}

/** Queue everything from a date (used when the trade chooses to send invoices already issued). */
export async function enqueueBacklog(admin: AdminClient, tradeId: string, from: string): Promise<number> {
  const conn = await connectionFor(admin, tradeId)
  if (!conn) return 0
  const { data: invs } = await admin.from('invoices').select('id, job_id').eq('trade_id', tradeId).gte('issued_at', from)
  const rows: { connection_id: string; trade_id: string; entity_type: SyncEntity; entity_id: string }[] = []
  for (const i of invs ?? []) rows.push({ connection_id: conn.id, trade_id: tradeId, entity_type: 'invoice', entity_id: i.id as string })
  const jobIds = Array.from(new Set((invs ?? []).map(i => i.job_id as string)))
  if (jobIds.length) {
    const { data: pays } = await admin.from('payments').select('id').in('job_id', jobIds)
    for (const p of pays ?? []) rows.push({ connection_id: conn.id, trade_id: tradeId, entity_type: 'payment', entity_id: p.id as string })
  }
  const { data: cns } = await admin.from('credit_notes').select('id').eq('trade_id', tradeId).gte('issued_at', from)
  for (const c of cns ?? []) rows.push({ connection_id: conn.id, trade_id: tradeId, entity_type: 'credit_note', entity_id: c.id as string })
  if (rows.length) await admin.from('accounting_sync_items').upsert(rows, { onConflict: 'connection_id,entity_type,entity_id', ignoreDuplicates: true })
  return rows.length
}
