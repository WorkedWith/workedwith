'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'


export type CreateTradeProfileInput = {
  trade_type: string
  company_name: string
  postcode: string
  bio: string
  username: string
}

export type CreateTradeProfileResult =
  | { success: true }
  | { success: false; error: string; field?: keyof CreateTradeProfileInput }

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i
const USERNAME_RE = /^[a-z0-9-]{3,30}$/

export async function createTradeProfile(
  input: CreateTradeProfileInput,
): Promise<CreateTradeProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || userData.verification_tier === 'unverified') {
    return { success: false, error: 'Phone verification is required before creating a profile.' }
  }

  const trade_type = input.trade_type.trim()
  const company_name = input.company_name.trim()
  const postcode = input.postcode.trim().toUpperCase()
  const bio = input.bio.trim()
  const username = input.username.trim().toLowerCase()

  if (!(TRADE_TYPES as readonly string[]).includes(trade_type)) {
    return { success: false, error: 'Please select a valid trade type.', field: 'trade_type' }
  }

  if (!postcode) {
    return { success: false, error: 'Please enter your postcode.', field: 'postcode' }
  }

  if (!UK_POSTCODE_RE.test(postcode)) {
    return { success: false, error: 'Please enter a valid UK postcode.', field: 'postcode' }
  }

  if (bio.length > 300) {
    return { success: false, error: 'Bio must be 300 characters or fewer.', field: 'bio' }
  }

  if (!USERNAME_RE.test(username)) {
    return {
      success: false,
      error: 'Username must be 3–30 characters — letters, numbers, and hyphens only.',
      field: 'username',
    }
  }

  // Second uniqueness guard (real-time check is first, this is defence-in-depth)
  const { data: existingUsername } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('public_slug', username)
    .maybeSingle()

  if (existingUsername) {
    return { success: false, error: 'This username is already taken.', field: 'username' }
  }

  const { error: insertError } = await admin.from('trade_profiles').insert({
    user_id: user.id,
    trade_types: [trade_type],
    company_name: company_name || null,
    postcode,
    public_slug: username,
    bio: bio || null,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, error: 'This username is already taken.', field: 'username' }
    }
    return { success: false, error: 'Failed to create your profile. Please try again.' }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ user_type: 'trade' })
    .eq('id', user.id)

  if (updateError) {
    return {
      success: false,
      error: 'Profile created but account update failed. Please contact support.',
    }
  }

  return { success: true }
}
