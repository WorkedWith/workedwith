'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { APP_URL } from '@/lib/app-url'
import { getTradeSession } from '@/lib/auth/require-trade'
import { encryptSecret, decryptSecret } from '@/lib/crypto/secret-box'
import { cleanAccountNumber, cleanSortCode } from '@/lib/getting-paid/bank-format'
import { openBanking } from '@/lib/open-banking'
import type { CopResult } from '@/types/v42'

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

const PATH = '/profile/getting-paid'
export const OPEN_BANKING_CALLBACK = `${APP_URL}/api/open-banking/callback`

/**
 * Bank details clients should pay (PRD 4 step 3). Required before the first quote. Checked with
 * Confirmation of Payee through the open banking provider where available.
 */
export async function saveBankDetails(input: {
  accountName: string
  sortCode: string
  accountNumber: string
}): Promise<ActionResult<{ cop: CopResult; copName: string | null }>> {
  const session = await getTradeSession()
  if (!session) return { ok: false, error: 'Please sign in as a trade.' }
  const { admin, userId } = session

  const accountName = input.accountName.trim().slice(0, 140)
  const sortCode = cleanSortCode(input.sortCode)
  const accountNumber = cleanAccountNumber(input.accountNumber)
  if (accountName.length < 2) return { ok: false, error: 'Enter the name on the account.' }
  if (!sortCode) return { ok: false, error: 'The sort code should be 6 numbers.' }
  if (!accountNumber) return { ok: false, error: 'The account number should be 8 numbers.' }

  let cop: CopResult = 'unavailable'
  let copName: string | null = null
  try {
    const r = await openBanking().confirmationOfPayee({ accountName, sortCode, accountNumber })
    cop = r.result
    copName = r.matchedName
  } catch (err) {
    console.error('Confirmation of Payee failed (non-fatal):', err)
  }

  const { data: existing } = await admin
    .from('trade_bank_accounts')
    .select('sort_code, account_number_encrypted, connection_status, provider, provider_connection_id')
    .eq('trade_id', userId)
    .maybeSingle()

  // A different account means the bank connection no longer reads the account clients pay into
  let accountChanged = false
  if (existing) {
    const oldNumber = decryptSecret(existing.account_number_encrypted)
    accountChanged = existing.sort_code !== sortCode || oldNumber !== accountNumber
    if (accountChanged && existing.provider_connection_id) {
      try {
        await openBanking().revoke({ connectionSecret: decryptSecret(existing.provider_connection_id) })
      } catch (err) {
        console.error('Revoke after account change failed (non-fatal):', err)
      }
    }
  }

  const now = new Date().toISOString()
  const row = {
    trade_id: userId,
    account_name: accountName,
    sort_code: sortCode,
    account_number_encrypted: encryptSecret(accountNumber),
    account_number_last4: accountNumber.slice(-4),
    confirmation_of_payee_result: cop,
    confirmation_of_payee_name: copName,
    confirmation_of_payee_checked_at: now,
    updated_at: now,
    ...(accountChanged
      ? { connection_status: 'not_connected' as const, provider: null, provider_connection_id: null, provider_bank_name: null, connected_at: null, consent_expires_at: null }
      : {}),
  }
  const { error } = await admin.from('trade_bank_accounts').upsert(row, { onConflict: 'trade_id' })
  if (error) return { ok: false, error: 'We could not save your bank details. Please try again.' }

  revalidatePath(PATH)
  return { ok: true, data: { cop, copName } }
}

/** Start (or reconfirm) the open banking connection. Returns the bank's approval page. */
export async function startBankConnection(): Promise<ActionResult<{ url: string }>> {
  const session = await getTradeSession()
  if (!session) return { ok: false, error: 'Please sign in as a trade.' }
  const { admin, userId } = session

  const { count } = await admin.from('trade_bank_accounts').select('id', { count: 'exact', head: true }).eq('trade_id', userId)
  if (!count) return { ok: false, error: 'Add the bank details clients should pay first.' }

  const provider = openBanking()
  const state = randomBytes(24).toString('base64url')
  await admin.from('open_banking_connect_states').insert({ state, trade_id: userId, provider: provider.id })
  try {
    const url = await provider.authorisationUrl({ state, redirectUri: OPEN_BANKING_CALLBACK })
    return { ok: true, data: { url } }
  } catch (err) {
    console.error('Open banking start failed:', err)
    return { ok: false, error: 'Connecting banks is not available right now. Everything still works: you can mark payments yourself.' }
  }
}

/** The trade picks "my bank isn't listed": everything still works with manual marking (PRD 4). */
export async function markBankUnsupported(): Promise<ActionResult> {
  const session = await getTradeSession()
  if (!session) return { ok: false, error: 'Please sign in as a trade.' }
  await session.admin
    .from('trade_bank_accounts')
    .update({ connection_status: 'unsupported', updated_at: new Date().toISOString() })
    .eq('trade_id', session.userId)
  revalidatePath(PATH)
  return { ok: true }
}

export async function disconnectBank(): Promise<ActionResult> {
  const session = await getTradeSession()
  if (!session) return { ok: false, error: 'Please sign in as a trade.' }
  const { admin, userId } = session
  const { data } = await admin.from('trade_bank_accounts').select('provider_connection_id').eq('trade_id', userId).maybeSingle()
  if (data?.provider_connection_id) {
    try {
      await openBanking().revoke({ connectionSecret: decryptSecret(data.provider_connection_id) })
    } catch (err) {
      console.error('Revoke failed (non-fatal):', err)
    }
  }
  await admin
    .from('trade_bank_accounts')
    .update({
      connection_status: 'not_connected',
      provider: null,
      provider_connection_id: null,
      provider_bank_name: null,
      connected_at: null,
      consent_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('trade_id', userId)
  revalidatePath(PATH)
  return { ok: true }
}
