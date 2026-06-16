'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type CreateClientProfileInput = {
  full_name: string
  postcode: string
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

  // Update full_name in case the user changed it here
  await admin.from('users').update({ full_name }).eq('id', user.id)

  const { error: insertError } = await admin.from('client_profiles').insert({
    user_id: user.id,
    postcode,
  })

  if (insertError) {
    return { success: false, error: 'Failed to create your profile. Please try again.' }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ user_type: 'client', client_type: 'individual' })
    .eq('id', user.id)

  if (updateError) {
    return {
      success: false,
      error: 'Profile created but account update failed. Please contact support.',
    }
  }

  return { success: true }
}
