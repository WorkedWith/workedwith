'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i

export type UpdateProfileInput = {
  full_name: string
  postcode: string
  bio?: string
  trade_types?: string[]
  years_experience?: number | null
  display_name?: string
}

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string; field?: keyof UpdateProfileInput }

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: rawUser } = await admin
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (!rawUser) return { success: false, error: 'User not found.' }

  const full_name = input.full_name.trim()
  const postcode = input.postcode.trim().toUpperCase()

  if (!full_name) return { success: false, error: 'Full name is required.', field: 'full_name' }
  if (!postcode) return { success: false, error: 'Postcode is required.', field: 'postcode' }
  if (!UK_POSTCODE_RE.test(postcode)) return { success: false, error: 'Please enter a valid UK postcode.', field: 'postcode' }

  const { error: nameErr } = await admin
    .from('users')
    .update({ full_name })
    .eq('id', user.id)

  if (nameErr) return { success: false, error: 'Failed to update name.' }

  const userType = rawUser.user_type as string | null
  const isTrade = userType === 'trade' || userType === 'both'

  if (isTrade) {
    const trade_types = input.trade_types ?? []
    if (trade_types.length === 0) return { success: false, error: 'Select at least one trade type.', field: 'trade_types' }
    const invalid = trade_types.filter(t => !(TRADE_TYPES as readonly string[]).includes(t))
    if (invalid.length > 0) return { success: false, error: 'Invalid trade type selected.', field: 'trade_types' }

    const { error: profileErr } = await admin
      .from('trade_profiles')
      .update({
        postcode,
        bio: input.bio?.trim() || null,
        trade_types,
        years_experience: input.years_experience ?? null,
      })
      .eq('user_id', user.id)

    if (profileErr) return { success: false, error: 'Failed to update trade profile.' }
  } else {
    const { error: profileErr } = await admin
      .from('client_profiles')
      .update({
        postcode,
        display_name: input.display_name?.trim() || null,
      })
      .eq('user_id', user.id)

    if (profileErr) return { success: false, error: 'Failed to update client profile.' }
  }

  return { success: true }
}
