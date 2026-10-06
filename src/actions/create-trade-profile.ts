'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'
import type { SeededProfile } from '@/types/database'

export type CreateTradeProfileInput = {
  trade_type: string
  company_name: string
  postcode: string
  bio: string
  username: string
  operating_areas: string[]
  seeded_token?: string
}

export type CreateTradeProfileResult =
  | { success: true }
  | { success: false; error: string; field?: keyof CreateTradeProfileInput }

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i
const USERNAME_RE = /^[a-z0-9-]{3,30}$/

function normaliseUKPhone(phone: string): string {
  const s = phone.replace(/[\s\-\(\)\.]/g, '')
  if (s.startsWith('+44')) return s
  if (s.startsWith('0044')) return '+44' + s.slice(4)
  if (s.startsWith('00')) return '+' + s.slice(2)
  if (s.startsWith('0')) return '+44' + s.slice(1)
  return s
}

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
  const operating_areas = input.operating_areas.map(d => d.trim().toUpperCase())

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

  // ── Seeded profile claim check ────────────────────────────────
  let seededProfile: SeededProfile | null = null
  if (input.seeded_token) {
    const { data: raw } = await admin
      .from('seeded_profiles')
      .select('*')
      .eq('claim_token', input.seeded_token)
      .maybeSingle()

    if (!raw) {
      return { success: false, error: 'The seeded profile claim link is invalid or has expired.' }
    }

    const sp = raw as unknown as SeededProfile

    if (sp.status !== 'unclaimed') {
      return { success: false, error: 'This listing has already been claimed or removed.' }
    }

    if (new Date(sp.expires_at) < new Date()) {
      return { success: false, error: 'This claim link has expired.' }
    }

    // Identity check: phone takes priority; fall back to email
    const userPhone = userData.phone as string | null
    const userPhoneVerified = userData.phone_verified as boolean
    const userEmail = (userData.email as string).trim().toLowerCase()

    if (sp.contact_phone) {
      const spPhoneE164 = normaliseUKPhone(sp.contact_phone)
      if (!userPhoneVerified || userPhone !== spPhoneE164) {
        return {
          success: false,
          error: 'Your verified phone number does not match this listing. Make sure you have verified the number on file for this business.',
        }
      }
    } else if (sp.contact_email) {
      // For the email path, require the address to be confirmed
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(user.id)
      if (!authUser?.email_confirmed_at) {
        return {
          success: false,
          error: 'Please confirm your email address before claiming this listing.',
        }
      }
      if (userEmail !== sp.contact_email.trim().toLowerCase()) {
        return {
          success: false,
          error: 'Your account email does not match this listing. Sign in with the email address on file for this business.',
        }
      }
    } else {
      return {
        success: false,
        error: 'This listing has no contact details and cannot be claimed.',
      }
    }

    seededProfile = sp
  }

  const { error: insertError } = await admin.from('trade_profiles').insert({
    user_id: user.id,
    trade_types: [trade_type],
    company_name: company_name || null,
    postcode,
    public_slug: username,
    bio: bio || null,
    operating_areas,
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

  // Mark seeded profile as claimed (non-fatal if it fails)
  if (seededProfile) {
    admin
      .from('seeded_profiles')
      .update({ status: 'claimed', claimed_by_user_id: user.id })
      .eq('id', seededProfile.id)
      .then(({ error }) => {
        if (error) console.error('Failed to mark seeded profile claimed (non-fatal):', error)
      })
  }

  return { success: true }
}
