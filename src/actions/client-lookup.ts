'use server'

import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { getUserSession } from '@/lib/auth/require-trade'
import { normaliseUkMobile } from '@/lib/phone'
import { computeClientRecord, type ClientRecord } from '@/lib/client-record/record'
import { recordClientRecordView } from '@/lib/client-record/views'

export type LookupResult =
  | { status: 'found'; record: ClientRecord }
  | { status: 'not_found' }
  | { status: 'rate_limited' }
  | { status: 'invalid'; error: string }
  | { status: 'unauthorized' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Client lookup (PRD 14): the exact email address or mobile number only, the same for every trade.
 * 20 lookups per 24 hours, every one logged. Lookup by username or name is not possible.
 */
export async function lookupClient(identifier: string): Promise<LookupResult> {
  const s = await getUserSession()
  if (!s) return { status: 'unauthorized' }
  const { admin, userId } = s
  const { data: u } = await admin.from('users').select('user_type, phone_verified').eq('id', userId).maybeSingle()
  if (!u || (u.user_type !== 'trade' && u.user_type !== 'both') || !u.phone_verified) return { status: 'unauthorized' }

  const raw = identifier.trim()
  const email = EMAIL_RE.test(raw) ? raw.toLowerCase() : null
  const mobile = email ? null : normaliseUkMobile(raw)
  if (!email && !mobile) return { status: 'invalid', error: 'Enter the client’s full email address or UK mobile number.' }

  const ip = headers().get('x-forwarded-for') ?? null
  const hash = createHash('sha256').update(email ?? mobile ?? '').digest('hex')
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await admin.from('search_audit_log').select('id', { count: 'exact', head: true }).eq('searcher_id', userId).gte('searched_at', since)
  if ((count ?? 0) >= 20) {
    await admin.from('search_audit_log').insert({ searcher_id: userId, identifier_hash: hash, result: 'rate_limited', ip_address: ip })
    return { status: 'rate_limited' }
  }
  const { data: found } = email
    ? await admin.from('users').select('id').ilike('email', email).maybeSingle()
    : await admin.from('users').select('id').eq('phone', mobile as string).maybeSingle()
  const record = found && found.id !== userId ? await computeClientRecord(admin, found.id as string) : null
  await admin.from('search_audit_log').insert({ searcher_id: userId, identifier_hash: hash, result: record ? 'match_found' : 'no_match', ip_address: ip })
  if (!record || !found) return { status: 'not_found' }
  await recordClientRecordView(admin, { tradeId: userId, clientId: found.id as string, reason: 'lookup' })
  return { status: 'found', record }
}
