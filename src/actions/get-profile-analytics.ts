'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionTier } from '@/types/database'

export type ProfileAnalytics = {
  profileViews: number
  searchAppearances: number
  periodLabel: string
}

export type ProfileAnalyticsResult =
  | { success: true; data: ProfileAnalytics }
  | { success: false; error: string }

export async function getProfileAnalytics(tradeProfileId: string): Promise<ProfileAnalyticsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorised' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('trade_profiles')
    .select('user_id, subscription_tier')
    .eq('id', tradeProfileId)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }
  if ((profile.user_id as string) !== user.id) return { success: false, error: 'Unauthorised' }
  if ((profile.subscription_tier as SubscriptionTier) !== 'pro') return { success: false, error: 'Pro subscription required' }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const [{ count: viewCount }, { count: appearanceCount }] = await Promise.all([
    admin
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('trade_profile_id', tradeProfileId)
      .gte('viewed_at', monthStart)
      .lt('viewed_at', nextMonthStart),
    admin
      .from('search_appearances')
      .select('id', { count: 'exact', head: true })
      .eq('trade_profile_id', tradeProfileId)
      .gte('appeared_at', monthStart)
      .lt('appeared_at', nextMonthStart),
  ])

  const periodLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return {
    success: true,
    data: {
      profileViews: viewCount ?? 0,
      searchAppearances: appearanceCount ?? 0,
      periodLabel,
    },
  }
}
