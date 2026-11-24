import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Audit of trades seeing a client's record (PRD 14, 21). Never throws. */
export async function recordClientRecordView(
  admin: AdminClient,
  p: { tradeId: string; clientId: string; reason: 'quoting' | 'lookup'; jobId?: string | null },
): Promise<void> {
  const { error } = await admin.from('client_record_views').insert({ trade_id: p.tradeId, client_id: p.clientId, reason: p.reason, job_id: p.jobId ?? null })
  if (error) console.error('client record view log failed (non-fatal):', error.message)
}

/**
 * A trade quoting the client sees the full record while the quote or job is open and for 12 months after
 * (PRD 14). Lookups are handled separately (exact email or mobile, rate limited and logged).
 */
export async function tradeCanSeeAsQuotingTrade(admin: AdminClient, tradeId: string, clientId: string): Promise<boolean> {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString()
  const { data } = await admin.from('jobs').select('id, status, updated_at, created_at').eq('flow', 'quote').eq('trade_user_id', tradeId).eq('client_user_id', clientId)
  return (data ?? []).some(j => !['paid', 'cancelled'].includes(j.status as string) || (j.updated_at as string) >= since || (j.created_at as string) >= since)
}
