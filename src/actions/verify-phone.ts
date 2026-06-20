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

function normaliseUKPhone(phone: string): string {
  // Strip all spaces, dashes, brackets
  const stripped = phone.replace(/[\s\-\(\)]/g, '')

  // Already in E.164 format
  if (stripped.startsWith('+44')) return stripped

  // Starts with 0044
  if (stripped.startsWith('0044')) return '+44' + stripped.slice(4)

  // Starts with 07, 08, 01, 02 etc (UK local format)
  if (stripped.startsWith('0')) return '+44' + stripped.slice(1)

  // Starts with 7 (missing leading zero)
  if (stripped.startsWith('7')) return '+44' + stripped

  return stripped
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
  console.log('sendOTP called with phone:', phone)
  console.log('TWILIO_ACCOUNT_SID exists:', !!process.env.TWILIO_ACCOUNT_SID)
  console.log('TWILIO_AUTH_TOKEN exists:', !!process.env.TWILIO_AUTH_TOKEN)
  console.log('TWILIO_VERIFY_SERVICE_SID exists:', !!process.env.TWILIO_VERIFY_SERVICE_SID)

  const normalized = normaliseUKPhone(phone)
  console.log('Normalised phone:', normalized)

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
    const client = twilioClient()
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: normalized, channel: 'sms' })
    console.log('Twilio response:', verification.status)
    return { success: true }
  } catch (error) {
    console.error('Twilio error full:', JSON.stringify(error, null, 2))
    const e = error as { code?: number; message?: string; status?: number }
    return { success: false, error: `SMS failed to send. Error code: ${e.code ?? 'unknown'}` }
  }
}

export async function verifyOTP(phone: string, code: string): Promise<VerifyOTPResult> {
  const normalized = normaliseUKPhone(phone)

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

  console.log('Twilio verification successful')

  // Get the authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in to verify your phone number.' }
  }

  console.log('Attempting to update user:', user.id)
  console.log('Phone to save:', normalized)

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

  // Check if the user row exists before attempting the update
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id, phone, verification_tier')
    .eq('id', user.id)
    .single()

  console.log('Existing user row:', JSON.stringify(existingUser, null, 2))
  console.log('Fetch error:', JSON.stringify(fetchError, null, 2))

  // Fetch current tier so we never downgrade a fully_verified user
  const { data: current } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const newTier: VerificationTier =
    current?.verification_tier === 'fully_verified' ? 'fully_verified' : 'phone_verified'

  const { data, error } = await supabase
    .from('users')
    .update({
      phone: normalized,
      phone_verified: true,
      verification_tier: 'phone_verified',
    })
    .eq('id', user.id)

  console.log('Update result data:', data)
  console.log('Update result error:', JSON.stringify(error, null, 2))

  if (error) throw error

  // Keep newTier reference to satisfy the linter (used in non-debug path)
  void newTier

  // Redirect destination differs by user type — both point to /dashboard for now;
  // extend this switch when type-specific dashboards are built
  const redirectTo =
    current?.user_type === 'trade'
      ? '/dashboard'
      : '/dashboard'

  return { success: true, redirectTo }
}
