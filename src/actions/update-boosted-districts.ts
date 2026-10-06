'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/i

export type UpdateBoostedDistrictsResult =
  | { success: true }
  | { success: false; error: string }

export async function updateBoostedDistricts(
  districts: string[],
): Promise<UpdateBoostedDistrictsResult> {
  // Preliminary length check — exact max depends on addon_quantity, validated after profile fetch

  const clean = districts.map(d => d.trim().toUpperCase())
  if (clean.some(d => !OUTCODE_RE.test(d))) {
    return { success: false, error: 'One or more district codes are invalid.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('trade_profiles')
    .select('subscription_tier, billing_period, operating_areas, boosted_district_addon_quantity, boosted_districts_updated_at, subscription_period_start_at, subscription_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return { success: false, error: 'Trade profile not found.' }

  if ((profile.subscription_tier as string) !== 'pro') {
    return { success: false, error: 'Boosted Districts require a Pro subscription.' }
  }

  const addonQty = (profile.boosted_district_addon_quantity as number) ?? 0
  const maxBoosts = 3 + addonQty
  if (districts.length > maxBoosts) {
    const addonNote = addonQty > 0 ? ` + ${addonQty} add-on` : ''
    return { success: false, error: `You can boost up to ${maxBoosts} district${maxBoosts !== 1 ? 's' : ''} (3 included${addonNote}).` }
  }

  // Cooldown: one change per billing cycle for monthly plans; rolling 30 days for
  // annual plans (annual period_start only advances once a year, which would be
  // unreasonably restrictive).
  const updatedAt      = profile.boosted_districts_updated_at as string | null
  const billingPeriod  = profile.billing_period as string | null
  const isAnnual       = billingPeriod === 'annual'

  if (updatedAt) {
    const updatedDate = new Date(updatedAt)

    if (isAnnual) {
      const thirtyDaysAfter = new Date(updatedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      if (new Date() < thirtyDaysAfter) {
        const availableFmt = thirtyDaysAfter.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        return {
          success: false,
          error: `Boosted Districts can only be changed once every 30 days. You can update them again from ${availableFmt}.`,
        }
      }
    } else {
      const periodStart = profile.subscription_period_start_at as string | null
      if (periodStart && updatedDate >= new Date(periodStart)) {
        const expiresAt  = profile.subscription_expires_at as string | null
        const renewalFmt = expiresAt
          ? new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'your next renewal'
        return {
          success: false,
          error: `Boosted Districts can only be changed once per billing cycle. You can update them again from ${renewalFmt}.`,
        }
      }
    }
  }

  // All chosen districts must be within current operating_areas (subset constraint)
  const operatingAreas = (profile.operating_areas as string[]) ?? []
  const invalid = clean.filter(d => !operatingAreas.includes(d))
  if (invalid.length > 0) {
    return {
      success: false,
      error: `${invalid.join(', ')} ${invalid.length === 1 ? 'is' : 'are'} not in your Operating Areas.`,
    }
  }

  const { error } = await admin
    .from('trade_profiles')
    .update({
      boosted_districts: clean,
      boosted_districts_updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) return { success: false, error: 'Failed to save Boosted Districts. Please try again.' }
  return { success: true }
}
