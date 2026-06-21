import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionTier } from '@/types/database'

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
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
