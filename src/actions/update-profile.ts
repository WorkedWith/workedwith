'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_TRADE_TERMS } from '@/lib/trade-types'
import { validateUsername } from '@/lib/username'

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i

export type UpdateProfileInput = {
  full_name: string
  postcode?: string
  bio?: string
  trade_types?: string[]
  years_experience?: number | null
  company_name?: string
  display_name?: string
  username?: string
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
  const postcode = (input.postcode ?? '').trim().toUpperCase()

  if (!full_name) return { success: false, error: 'Full name is required.', field: 'full_name' }

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
    const invalid = trade_types.filter(t => !(ALL_TRADE_TERMS as readonly string[]).includes(t))
    if (!(input.company_name ?? '').trim()) return { success: false, error: 'Add your business or trading name. It is the heading on your profile.', field: 'company_name' }
    if ((input.company_name ?? '').length > 80) return { success: false, error: 'Company name must be 80 characters or fewer.', field: 'company_name' }
    if (invalid.length > 0) return { success: false, error: 'Invalid trade type selected.', field: 'trade_types' }

    const { error: profileErr } = await admin
      .from('trade_profiles')
      .update({
        company_name: input.company_name?.trim() || null,
        bio: input.bio?.trim() || null,
        trade_types,
        years_experience: input.years_experience ?? null,
      })
      .eq('user_id', user.id)

    if (profileErr) return { success: false, error: 'Failed to update trade profile.' }
  } else {
    if (!postcode) return { success: false, error: 'Postcode is required.', field: 'postcode' }
    if (!UK_POSTCODE_RE.test(postcode)) return { success: false, error: 'Please enter a valid UK postcode.', field: 'postcode' }
    const update: { postcode: string; display_name: string | null; username?: string } = {
      postcode,
      display_name: input.display_name?.trim() || null,
    }
    if (input.username !== undefined) {
      const uname = validateUsername(input.username)
      if (uname.error) return { success: false, error: uname.error, field: 'username' }
      const { data: taken } = await admin
        .from('client_profiles')
        .select('user_id')
        .eq('username', uname.value)
        .neq('user_id', user.id)
        .maybeSingle()
      if (taken) return { success: false, error: 'That username is already taken. Please choose another.', field: 'username' }
      update.username = uname.value
    }
    const { error: profileErr } = await admin
      .from('client_profiles')
      .update(update)
      .eq('user_id', user.id)

    if (profileErr) return { success: false, error: 'Failed to update client profile.' }
  }

  return { success: true }
}
