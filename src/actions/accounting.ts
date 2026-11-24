'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { APP_URL } from '@/lib/app-url'
import { getTradeSession } from '@/lib/auth/require-trade'
import { accountingProvider, PLATFORMS } from '@/lib/accounting'
import { enqueueBacklog, runAccountingSync } from '@/lib/accounting/sync'
import { decryptSecret } from '@/lib/crypto/secret-box'
import type { AccountingPlatform } from '@/types/v42'
import type { Tokens } from '@/lib/accounting/types'

type R<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }
const PATH = '/profile/getting-paid'
export const ACCOUNTING_CALLBACK = `${APP_URL}/api/accounting/callback`

/** One accounting connection per trade (PRD 12). The trade signs in through their software to approve. */
export async function startAccountingConnection(platform: AccountingPlatform): Promise<R<{ url: string }>> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  if (!PLATFORMS.includes(platform)) return { ok: false, error: 'Pick your accounting software.' }
  const { data: existing } = await s.admin.from('accounting_connections').select('platform, status').eq('trade_id', s.userId).maybeSingle()
  if (existing && existing.status === 'connected' && existing.platform !== platform) return { ok: false, error: 'Disconnect your current software first. You can have one connection.' }
  const state = randomBytes(24).toString('base64url')
  await s.admin.from('accounting_connect_states').insert({ state, trade_id: s.userId, platform })
  try {
    return { ok: true, data: { url: accountingProvider(platform).authorisationUrl({ state, redirectUri: ACCOUNTING_CALLBACK }) } }
  } catch (err) {
    console.error('Accounting start failed:', err)
    return { ok: false, error: 'This accounting software isn’t available to connect yet. The CSV export always works.' }
  }
}

/** The trade confirms the sales account, bank account, VAT mapping and where to sync from. */
export async function finishAccountingSetup(input: { salesAccount: string; bankAccount: string; vatRate: string; syncFrom: 'today' | 'existing' }): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const { data: conn } = await s.admin.from('accounting_connections').select('*').eq('trade_id', s.userId).maybeSingle()
  if (!conn) return { ok: false, error: 'Connect your accounting software first.' }
  if (!input.salesAccount || !input.bankAccount) return { ok: false, error: 'Pick the sales account and the bank account.' }
  const today = new Date().toISOString().slice(0, 10)
  const from = input.syncFrom === 'existing' ? '2000-01-01' : today
  await s.admin.from('accounting_connections').update({
    sales_account_code: input.salesAccount, payment_account_id: input.bankAccount, vat_mapping: { standard: input.vatRate || 'standard' },
    sync_from: from, status: 'connected', connected_at: new Date().toISOString(), expired_notified_at: null, updated_at: new Date().toISOString(),
  }).eq('id', conn.id)
  if (input.syncFrom === 'existing') await enqueueBacklog(s.admin, s.userId, from)
  // Re-queue anything missed while the connection was expired
  await s.admin.from('accounting_sync_items').update({ next_attempt_at: new Date().toISOString() }).eq('connection_id', conn.id).eq('status', 'pending')
  await runAccountingSync(s.admin, s.userId)
  revalidatePath(PATH)
  return { ok: true }
}

export async function disconnectAccounting(): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const { data: conn } = await s.admin.from('accounting_connections').select('*').eq('trade_id', s.userId).maybeSingle()
  if (!conn) return { ok: true }
  try {
    if (conn.tokens_encrypted) await accountingProvider(conn.platform).disconnect({ tokens: JSON.parse(decryptSecret(conn.tokens_encrypted)) as Tokens, orgId: conn.external_org_id })
  } catch (err) {
    console.error('Accounting disconnect failed (non-fatal):', err)
  }
  await s.admin.from('accounting_connections').delete().eq('id', conn.id)
  revalidatePath(PATH)
  return { ok: true }
}

/** Retry failed syncs (from "Needs you"). A sync failure never blocks the job or the payment. */
export async function retryFailedSyncs(): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  await s.admin.from('accounting_sync_items').update({ status: 'pending', attempts: 0, first_attempt_at: null, next_attempt_at: new Date().toISOString() }).eq('trade_id', s.userId).eq('status', 'failed')
  await runAccountingSync(s.admin, s.userId)
  revalidatePath(PATH)
  revalidatePath('/dashboard')
  return { ok: true }
}
