import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionTier, TierGrant } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

const RANK: Record<SubscriptionTier, number> = { free: 0, standard: 1, pro: 2 }

export function higherTier(a: SubscriptionTier, b: SubscriptionTier): SubscriptionTier {
  return RANK[a] >= RANK[b] ? a : b
}

/** A grant counts only between its start and end, and only while it has not been ended. Checked at read time. */
export function isGrantActive(
  grant: Pick<TierGrant, 'starts_at' | 'ends_at' | 'ended_at'>,
  now: Date = new Date(),
): boolean {
  if (grant.ended_at) return false
  return new Date(grant.starts_at) <= now && new Date(grant.ends_at) > now
}

/** Active grants for a set of trade users, keyed by user id. */
export async function getActiveGrants(admin: AdminClient, userIds: string[]): Promise<Map<string, TierGrant>> {
  const map = new Map<string, TierGrant>()
  if (userIds.length === 0) return map
  const nowIso = new Date().toISOString()
  const { data } = await admin
    .from('tier_grants')
    .select('*')
    .in('user_id', userIds)
    .is('ended_at', null)
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)
  for (const row of (data ?? []) as unknown as TierGrant[]) map.set(row.user_id, row)
  return map
}

/**
 * The one place that decides what plan a trade is on for feature purposes:
 * the higher of their paid subscription tier and their active grant tier.
 */
export function effectiveTierFrom(paid: SubscriptionTier | null | undefined, grant: TierGrant | null | undefined): SubscriptionTier {
  const base: SubscriptionTier = paid ?? 'free'
  if (!grant || !isGrantActive(grant)) return base
  return higherTier(base, grant.tier)
}

export async function getEffectiveTier(userId: string): Promise<SubscriptionTier> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('trade_profiles')
    .select('subscription_tier')
    .eq('user_id', userId)
    .maybeSingle()
  const paid = (data?.subscription_tier as SubscriptionTier | null | undefined) ?? 'free'
  const grants = await getActiveGrants(admin, [userId])
  return effectiveTierFrom(paid, grants.get(userId))
}

/** Same as getEffectiveTier but for many trade users at once. */
export async function getEffectiveTiers(
  admin: AdminClient,
  rows: { user_id: string; subscription_tier: SubscriptionTier | string | null }[],
): Promise<Map<string, SubscriptionTier>> {
  const grants = await getActiveGrants(admin, rows.map(r => r.user_id))
  const out = new Map<string, SubscriptionTier>()
  for (const r of rows) {
    out.set(r.user_id, effectiveTierFrom((r.subscription_tier as SubscriptionTier | null) ?? 'free', grants.get(r.user_id)))
  }
  return out
}
