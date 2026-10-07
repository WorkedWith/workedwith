'use server'

import { suggestUsername } from '@/lib/username'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'
import type { CreateTradeProfileInput, CreateTradeProfileResult } from './create-trade-profile'

const UK_DISTRICT_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/i
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
  const bio = input.bio.trim()
  const username = input.username.trim().toLowerCase()
  const operating_areas = input.operating_areas.map(d => d.trim().toUpperCase())

  if (!(TRADE_TYPES as readonly string[]).includes(trade_type)) {
    return { success: false, error: 'Please select a valid trade type.', field: 'trade_type' }
  }
  if (operating_areas.length === 0 || !operating_areas.every(d => UK_DISTRICT_RE.test(d))) {
    return { success: false, error: 'Please add at least one postcode district where you work.', field: 'operating_areas' }
  }
  if (bio.length > 300) {
    return { success: false, error: 'Bio must be 300 characters or fewer.', field: 'bio' }
  }
  if (!USERNAME_RE.test(username)) {
    return {
      success: false,
      error: 'Username must be 3 to 30 characters, letters, numbers, and hyphens only.',
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
    public_slug: username,
    bio: bio || null,
    operating_areas,
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

  // Tradespeople no longer have a postcode on file, so the client postcode starts empty
  const postcode = ''

  const baseName = suggestUsername(String(rawUser.full_name ?? '')).replace(/\./g, '').slice(0, 14) || 'client'
  const autoUsername = `${baseName}${Math.random().toString(36).slice(2, 6)}`
  const { error: insertError } = await admin.from('client_profiles').insert({
    user_id: user.id,
    postcode,
    username: autoUsername,
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
