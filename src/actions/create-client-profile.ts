'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateUsername } from '@/lib/username'

export type CreateClientProfileInput = {
  full_name: string
  postcode: string
  username: string
}

export type CreateClientProfileResult =
  | { success: true }
  | { success: false; error: string; field?: keyof CreateClientProfileInput }

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i

export async function createClientProfile(
  input: CreateClientProfileInput,
): Promise<CreateClientProfileResult> {
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

  const full_name = input.full_name.trim()
  const postcode = input.postcode.trim().toUpperCase()

  if (!full_name) {
    return { success: false, error: 'Please enter your full name.', field: 'full_name' }
  }

  if (!postcode) {
    return { success: false, error: 'Please enter your postcode.', field: 'postcode' }
  }

  if (!UK_POSTCODE_RE.test(postcode)) {
    return { success: false, error: 'Please enter a valid UK postcode.', field: 'postcode' }
  }

  const uname = validateUsername(input.username ?? '')
  if (uname.error) {
    return { success: false, error: uname.error, field: 'username' }
  }
  const { data: taken } = await admin
    .from('client_profiles')
    .select('id')
    .eq('username', uname.value)
    .maybeSingle()
  if (taken) {
    return { success: false, error: 'That username is already taken. Please choose another.', field: 'username' }
  }

  // Update full_name in case the user changed it here
  await admin.from('users').update({ full_name }).eq('id', user.id)

  console.log('Creating client profile for user:', user.id)
  console.log('Input data:', JSON.stringify(input, null, 2))

  const { data, error: insertError } = await admin
    .from('client_profiles')
    .insert({
      user_id: user.id,
      postcode,
      display_name: full_name,
      username: uname.value,
      client_type: 'individual',
    })
    .select()

  console.log('Insert data:', JSON.stringify(data, null, 2))
  console.log('Insert error:', JSON.stringify(insertError, null, 2))

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, error: 'That username is already taken. Please choose another.', field: 'username' }
    }
    return { success: false, error: 'Failed to create your profile. Please try again.' }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ user_type: 'client_individual', client_type: 'individual' })
    .eq('id', user.id)

  if (updateError) {
    return {
      success: false,
      error: 'Profile created but account update failed. Please contact support.',
    }
  }

  return { success: true }
}
