import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionTier } from '@/types/database'
import { getEffectiveTier } from '@/lib/tier'

/**
 * The plan a trade can use features of: the higher of their paid subscription and any
 * active admin grant (PRD v3.8 item 6). Every feature check goes through this.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  return getEffectiveTier(userId)
}

/** What Stripe says they pay for, ignoring grants. Billing screens only. */
export async function getPaidTier(userId: string): Promise<SubscriptionTier> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('trade_profiles')
    .select('subscription_tier')
    .eq('user_id', userId)
    .maybeSingle()

  return (data?.subscription_tier as SubscriptionTier | null | undefined) ?? 'free'
}

export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === 'standard' || tier === 'pro'
}

export function isProTier(tier: string | null): boolean {
  return tier === 'pro'
}

export function isStandardOrAbove(tier: string | null): boolean {
  return tier === 'standard' || tier === 'pro'
}
