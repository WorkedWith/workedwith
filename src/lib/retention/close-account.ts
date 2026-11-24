import { createHash } from 'crypto'
import type { createAdminClient } from '@/lib/supabase/admin'
import { openBanking } from '@/lib/open-banking'
import { accountingProvider } from '@/lib/accounting'
import { decryptSecret, encryptSecret } from '@/lib/crypto/secret-box'
import { getPayeeDetails } from '@/lib/getting-paid/bank-account'
import { getStripeClient } from '@/lib/stripe/client'
import type { Tokens } from '@/lib/accounting/types'

type AdminClient = ReturnType<typeof createAdminClient>

const sha = (v: string) => createHash('sha256').update(v).digest('hex')

/** True when the user has any v4.2 job, so their account must be closed rather than deleted. */
export async function hasFinancialRecords(admin: AdminClient, userId: string): Promise<boolean> {
  const [{ count: t }, { count: c }] = await Promise.all([
    admin.from('jobs').select('id', { count: 'exact', head: true }).eq('flow', 'quote').eq('trade_user_id', userId),
    admin.from('jobs').select('id', { count: 'exact', head: true }).eq('flow', 'quote').eq('client_user_id', userId),
  ])
  return (t ?? 0) + (c ?? 0) > 0
}

/** Identity hashes go to deactivated identities, so the phone and ID stay blocked (key rule 20). */
export async function blockIdentities(admin: AdminClient, userId: string): Promise<boolean> {
  const { data: u } = await admin.from('users').select('phone, licence_number_hash').eq('id', userId).maybeSingle()
  const rows = [
    ...(u?.phone ? [{ identity_hash: sha(u.phone as string), identity_type: 'phone' as const, deactivated_by: null, reason: 'account_closed' }] : []),
    ...(u?.licence_number_hash ? [{ identity_hash: u.licence_number_hash as string, identity_type: 'licence_number' as const, deactivated_by: null, reason: 'account_closed' }] : []),
  ]
  if (rows.length === 0) return true
  const { error } = await admin.from('deactivated_identities').upsert(rows, { onConflict: 'identity_hash,identity_type', ignoreDuplicates: true })
  return !error
}

/**
 * Close an account that has WorkedWith jobs (PRD 11). The login is removed and personal details are
 * scrubbed; jobs, invoices, payments and the trade's records stay for 6 years. Reviews are anonymised but
 * kept. For a trade: the bank and accounting connections are revoked, the bank details deleted (issued
 * invoices keep their frozen copy), cards switched off, the plan cancelled and the listing hidden.
 */
export async function closeAccount(admin: AdminClient, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await blockIdentities(admin, userId))) return { ok: false, error: 'We could not close your account. Please contact support.' }
  const now = new Date().toISOString()

  // Reviews: anonymised but kept
  await admin.from('reviews').update({ written_review: null, red_flag: false, red_flag_reason: null }).eq('reviewer_id', userId)

  const { data: tp } = await admin.from('trade_profiles').select('id, stripe_subscription_id').eq('user_id', userId).maybeSingle()
  if (tp) {
    // Freeze bank details onto any issued invoice that doesn't have them yet, then delete the live copy
    const payee = await getPayeeDetails(admin, userId)
    if (payee) await admin.from('invoices').update({ payee_snapshot_encrypted: encryptSecret(JSON.stringify(payee)) }).eq('trade_id', userId).is('payee_snapshot_encrypted', null)
    const { data: bank } = await admin.from('trade_bank_accounts').select('provider_connection_id').eq('trade_id', userId).maybeSingle()
    if (bank?.provider_connection_id) await openBanking().revoke({ connectionSecret: decryptSecret(bank.provider_connection_id) }).catch(() => undefined)
    await admin.from('trade_bank_accounts').delete().eq('trade_id', userId)
    const { data: acc } = await admin.from('accounting_connections').select('*').eq('trade_id', userId).maybeSingle()
    if (acc?.tokens_encrypted) await accountingProvider(acc.platform).disconnect({ tokens: JSON.parse(decryptSecret(acc.tokens_encrypted)) as Tokens, orgId: acc.external_org_id }).catch(() => undefined)
    if (acc) await admin.from('accounting_connections').delete().eq('id', acc.id)
    await admin.from('trade_card_accounts').update({ cards_enabled: false }).eq('trade_id', userId)
    if (tp.stripe_subscription_id) await getStripeClient().subscriptions.cancel(tp.stripe_subscription_id as string).catch(() => undefined)
    await admin.from('quotes').update({ status: 'withdrawn', withdrawn_at: now }).eq('trade_user_id', userId).in('status', ['draft', 'sent', 'viewed', 'changes_requested'])
    await admin.from('trade_profiles').update({
      closed_at: now, is_searchable: false, subscription_status: 'cancelled', boosted_districts: [],
      business_phone: null, reply_email: null, stripe_subscription_id: null,
    }).eq('user_id', userId)
    await admin.from('boost_waitlist').update({ removed_at: now }).eq('user_id', userId).is('removed_at', null)
  }

  const { data: cp } = await admin.from('client_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (cp) {
    // The client's record settings and personal details go; their jobs keep the name and address as quoted
    await admin.from('client_profiles').update({ closed_at: now, display_name: null, username: null, companies_house_number: null, is_searchable: false }).eq('id', cp.id)
  }

  await admin.from('client_access_links').delete().eq('client_user_id', userId)
  await admin.from('notifications').delete().eq('user_id', userId)
  const scrubbed = `closed+${userId}@closed.workedwith.invalid`
  await admin.from('users').update({
    email: scrubbed, phone: null, phone_verified: false, full_name: tp ? 'Closed account' : 'Closed account', profile_photo_url: null, closed_at: now,
  }).eq('id', userId)
  // Remove the login: no password, a changed email, and banned, so nobody can sign in again
  const { error } = await admin.auth.admin.updateUserById(userId, { email: scrubbed, ban_duration: '876000h', user_metadata: {} })
  if (error) console.error('Auth close failed:', error)
  return { ok: true }
}
