'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyBoostChange } from '@/lib/boosts/apply-boost-change'
import type { BoostSummary } from '@/lib/boost-types'

const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/i

export type UpdateOperatingAreasResult =
  | { success: true; boost: BoostSummary | null }
  | { success: false; error: string }

export async function updateOperatingAreas(
  districts: string[],
): Promise<UpdateOperatingAreasResult> {
  if (districts.length > 20) {
    return { success: false, error: 'You can add up to 20 operating areas.' }
  }

  const clean = districts.map(d => d.trim().toUpperCase())
  if (clean.some(d => !OUTCODE_RE.test(d))) {
    return { success: false, error: 'One or more district codes are invalid.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()

  // A district cannot be boosted if it is no longer an operating area.
  // Removing a boosted area is treated as switching that boost off.
  const { data: current } = await admin
    .from('trade_profiles')
    .select('boosted_districts')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentBoosted = (current?.boosted_districts as string[] | null) ?? []
  const newBoosted = currentBoosted.filter(d => clean.includes(d))
  const removedBoosts = currentBoosted.filter(d => !clean.includes(d))

  let boost: BoostSummary | null = null

  if (removedBoosts.length > 0) {
    const result = await applyBoostChange(user.id, newBoosted, {
      confirmedPaid: true, // reducing only, never a new charge
      event: { type: 'area_removed', districts: removedBoosts },
    })
    if (result.status === 'error') return { success: false, error: result.error }
    if (result.status === 'ok') boost = result.summary
  }

  const { error } = await admin
    .from('trade_profiles')
    .update({ operating_areas: clean })
    .eq('user_id', user.id)

  if (error) return { success: false, error: 'Failed to save operating areas. Please try again.' }
  return { success: true, boost }
}
