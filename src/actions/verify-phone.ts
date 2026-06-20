'use server'

import twilio from 'twilio'
import { createHash } from 'crypto'
import { redirect } from 'next/navigation'
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
    .select('id')
    .eq('phone', normalized)
    .neq('id', user.id)
    .maybeSingle()

  if (conflict) {
    return { success: false, error: 'This number is already linked to another account. Please contact support.' }
  }

  // Fetch current row so we never downgrade a fully_verified user
  const { data: current } = await admin
    .from('users')
    .select('verification_tier')
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

  // Redirect based on user_type
  const { data: userData } = await admin
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()

  const userType = userData?.user_type

  if (userType === 'trade') {
    redirect('/onboarding/trade')
  } else if (userType === 'client_business') {
    redirect('/onboarding/business')
  } else {
    redirect('/onboarding/individual')
  }
}
