'use server'

import twilio from 'twilio'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { VerificationTier } from '@/types/database'

// ── Types ────────────────────────────────────────────────────

export type SendOTPResult =
  | { success: true }
  | { success: false; error: string }

export type VerifyOTPResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string }

// ── Helpers ──────────────────────────────────────────────────

function normalizeUKMobile(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, '')
  if (/^\+447\d{9}$/.test(cleaned)) return cleaned
  if (/^07\d{9}$/.test(cleaned)) return '+44' + cleaned.slice(1)
  return null
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function twilioClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  )
}

const VERIFY_SID = () => process.env.TWILIO_VERIFY_SERVICE_SID!

// ── Actions ──────────────────────────────────────────────────

export async function sendOTP(phone: string): Promise<SendOTPResult> {
  const normalized = normalizeUKMobile(phone)
  if (!normalized) {
    return { success: false, error: 'Please enter a valid UK mobile number (e.g. 07700 900000).' }
  }

  // Check deactivated identities — return a generic error to avoid info leakage
  const admin = createAdminClient()
  const { data: blocked } = await admin
    .from('deactivated_identities')
    .select('id')
    .eq('identity_hash', sha256(normalized))
    .eq('identity_type', 'phone')
    .maybeSingle()

  if (blocked) {
    return { success: false, error: 'Unable to send a verification code. Please contact support.' }
  }

  try {
    await twilioClient()
      .verify.v2.services(VERIFY_SID())
      .verifications.create({ to: normalized, channel: 'sms' })

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to send verification code. Please try again.' }
  }
}

export async function verifyOTP(phone: string, code: string): Promise<VerifyOTPResult> {
  const normalized = normalizeUKMobile(phone)
  if (!normalized) {
    return { success: false, error: 'Invalid phone number.' }
  }

  if (!/^\d{6}$/.test(code.trim())) {
    return { success: false, error: 'Please enter the 6-digit code.' }
  }

  // Confirm the code with Twilio
  try {
    const check = await twilioClient()
      .verify.v2.services(VERIFY_SID())
      .verificationChecks.create({ to: normalized, code: code.trim() })

    if (check.status !== 'approved') {
      return { success: false, error: 'Incorrect code. Please try again.' }
    }
  } catch {
    return { success: false, error: 'Verification failed. Please try again.' }
  }

  // Get the authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in to verify your phone number.' }
  }

  const admin = createAdminClient()

  // Guard against the phone already belonging to another account
  const { data: conflict } = await admin
    .from('users')
    .select('*')
    .eq('phone', normalized)
    .neq('id', user.id)
    .maybeSingle()

  if (conflict) {
    return { success: false, error: 'This number is already linked to another account. Please contact support.' }
  }

  // Fetch current tier so we never downgrade a fully_verified user
  const { data: current } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const newTier: VerificationTier =
    current?.verification_tier === 'fully_verified' ? 'fully_verified' : 'phone_verified'

  const { error: updateError } = await admin
    .from('users')
    .update({ phone: normalized, phone_verified: true, verification_tier: newTier })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: 'Failed to save your phone number. Please try again.' }
  }

  // Redirect destination differs by user type — both point to /dashboard for now;
  // extend this switch when type-specific dashboards are built
  const redirectTo =
    current?.user_type === 'trade'
      ? '/dashboard'
      : '/dashboard'

  return { success: true, redirectTo }
}
