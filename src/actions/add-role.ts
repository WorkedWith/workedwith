'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'
import type { CreateTradeProfileInput, CreateTradeProfileResult } from './create-trade-profile'

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i
const USERNAME_RE = /^[a-z0-9-]{3,30}$/

// ── Add trade role (client → both) ────────────────────────────

export async function addTradeRole(
  input: CreateTradeProfileInput,
): Promise<CreateTradeProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: rawUser } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!rawUser) return { success: false, error: 'User not found.' }

  const userType = rawUser.user_type as string | null
  if (userType !== 'client_individual' && userType !== 'client_business') {
    return { success: false, error: 'This action is only available to client accounts.' }
  }
  if (rawUser.verification_tier === 'unverified') {
    return { success: false, error: 'Phone verification is required before adding a trade profile.' }
  }

  const trade_type = input.trade_type.trim()
  const company_name = input.company_name.trim()
  const postcode = input.postcode.trim().toUpperCase()
  const bio = input.bio.trim()
  const username = input.username.trim().toLowerCase()

  if (!(TRADE_TYPES as readonly string[]).includes(trade_type)) {
    return { success: false, error: 'Please select a valid trade type.', field: 'trade_type' }
  }
  if (!postcode || !UK_POSTCODE_RE.test(postcode)) {
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

  const { data: existingSlug } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('public_slug', username)
    .maybeSingle()

  if (existingSlug) {
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
    return { success: false, error: 'Failed to create your trade profile. Please try again.' }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ user_type: 'both' })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: 'Profile created but account update failed. Please contact support.' }
  }

  return { success: true }
}

// ── Add client role (trade → both) ────────────────────────────

export async function addClientRole(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: rawUser } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!rawUser) return { error: 'User not found.' }

  const userType = rawUser.user_type as string | null
  if (userType !== 'trade') {
    return { error: 'This action is only available to trade accounts.' }
  }

  // Borrow postcode from the trade profile so client_profiles.postcode is non-empty
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('postcode')
    .eq('user_id', user.id)
    .maybeSingle()

  const postcode = (tradeProfile?.postcode as string | undefined) ?? ''

  const { error: insertError } = await admin.from('client_profiles').insert({
    user_id: user.id,
    postcode,
  })

  if (insertError) {
    return { error: 'Failed to create client profile. Please try again.' }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ user_type: 'both' })
    .eq('id', user.id)

  if (updateError) {
    return { error: 'Profile created but account update failed. Please contact support.' }
  }

  redirect('/dashboard')
}
