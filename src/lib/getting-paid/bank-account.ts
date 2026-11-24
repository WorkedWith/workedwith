import type { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/crypto/secret-box'
import type { BankConnectionStatus, CopResult } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** Safe to show the trade: the account number is masked. */
export type BankAccountSummary = {
  accountName: string
  sortCode: string
  accountNumberLast4: string
  copResult: CopResult | null
  copName: string | null
  connectionStatus: BankConnectionStatus
  bankName: string | null
  connectedAt: string | null
  consentExpiresAt: string | null
  lastSyncedAt: string | null
}

export async function getBankAccountSummary(admin: AdminClient, tradeId: string): Promise<BankAccountSummary | null> {
  const { data } = await admin.from('trade_bank_accounts').select('*').eq('trade_id', tradeId).maybeSingle()
  if (!data) return null
  return {
    accountName: data.account_name,
    sortCode: data.sort_code,
    accountNumberLast4: data.account_number_last4,
    copResult: data.confirmation_of_payee_result,
    copName: data.confirmation_of_payee_name,
    connectionStatus: data.connection_status,
    bankName: data.provider_bank_name,
    connectedAt: data.connected_at,
    consentExpiresAt: data.consent_expires_at,
    lastSyncedAt: data.last_synced_at,
  }
}

/** The full details clients need to pay (invoices, chasing). Server only. */
export type PayeeDetails = { accountName: string; sortCode: string; accountNumber: string }

export async function getPayeeDetails(admin: AdminClient, tradeId: string): Promise<PayeeDetails | null> {
  const { data } = await admin
    .from('trade_bank_accounts')
    .select('account_name, sort_code, account_number_encrypted')
    .eq('trade_id', tradeId)
    .maybeSingle()
  if (!data) return null
  return { accountName: data.account_name, sortCode: data.sort_code, accountNumber: decryptSecret(data.account_number_encrypted) }
}

export async function hasBankDetails(admin: AdminClient, tradeId: string): Promise<boolean> {
  const { count } = await admin.from('trade_bank_accounts').select('id', { count: 'exact', head: true }).eq('trade_id', tradeId)
  return (count ?? 0) > 0
}
