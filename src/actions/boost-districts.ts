'use server'

import { createClient } from '@/lib/supabase/server'
import { applyBoostChange } from '@/lib/boosts/apply-boost-change'
import type { BoostChangeResult } from '@/lib/boost-types'
import { createAdminClient } from '@/lib/supabase/admin'

const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/

async function currentBoosted(userId: string): Promise<string[] | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('trade_profiles')
    .select('boosted_districts')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  return (data.boosted_districts as string[] | null) ?? []
}

/** Switch a district's boost on or off. */
export async function setDistrictBoost(
  district: string,
  on: boolean,
  confirmedPaid = false,
): Promise<BoostChangeResult> {
  const code = district.trim().toUpperCase()
  if (!OUTCODE_RE.test(code)) return { status: 'error', error: 'That district code is not valid.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', error: 'You must be signed in.' }

  const current = await currentBoosted(user.id)
  if (current === null) return { status: 'error', error: 'Trade profile not found.' }

  const next = on ? Array.from(new Set([...current, code])) : current.filter(d => d !== code)

  return applyBoostChange(user.id, next, {
    confirmedPaid,
    event: { type: on ? 'on' : 'off', district: code },
  })
}

/** Move a boost from one operating area to another. No billing change. */
export async function swapDistrictBoost(from: string, to: string): Promise<BoostChangeResult> {
  const fromCode = from.trim().toUpperCase()
  const toCode = to.trim().toUpperCase()
  if (!OUTCODE_RE.test(fromCode) || !OUTCODE_RE.test(toCode)) {
    return { status: 'error', error: 'That district code is not valid.' }
  }
  if (fromCode === toCode) return { status: 'error', error: 'Pick a different district to move your boost to.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', error: 'You must be signed in.' }

  const current = await currentBoosted(user.id)
  if (current === null) return { status: 'error', error: 'Trade profile not found.' }
  if (!current.includes(fromCode)) return { status: 'error', error: `${fromCode} is not currently boosted.` }
  if (current.includes(toCode)) return { status: 'error', error: `${toCode} is already boosted.` }

  const next = current.map(d => (d === fromCode ? toCode : d))
  return applyBoostChange(user.id, next, {
    confirmedPaid: true, // same number of slots, so never a new charge
    event: { type: 'swap', from: fromCode, to: toCode },
  })
}
