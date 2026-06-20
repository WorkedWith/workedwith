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
  | { success: false; error: string; redirectTo?: string }

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

  const admin = createAdminClient()

  // Detect conflict early so we don't send an SMS that can't be used
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: phoneConflict } = currentUser
    ? await admin.from('users').select('id').eq('phone', normalized).neq('id', currentUser.id).maybeSingle()
    : await admin.from('users').select('id').eq('phone', normalized).maybeSingle()

  if (phoneConflict) {
    return {
      success: false,
      error: 'You already have a WorkedWith account with this number. Sign in instead.',
      redirectTo: '/sign-in',
    }
  }

  // Check deactivated identities — return a generic error to avoid info leakage
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

  // Fetch full auth user so we have email + metadata for the fallback upsert
  const { data: { user: authUser } } = await admin.auth.admin.getUserById(user.id)

  // Guard against the phone already belonging to another account
  const { data: conflict } = await admin
    .from('users')
    .select('id')
    .eq('phone', normalized)
    .neq('id', user.id)
    .maybeSingle()

  if (conflict) {
    return { success: false, error: 'You already have a WorkedWith account with this number. Sign in instead.' }
  }

  // Fetch current row to avoid downgrading a fully_verified user
  const { data: current } = await admin
    .from('users')
    .select('verification_tier, user_type')
    .eq('id', user.id)
    .maybeSingle()

  const newTier: VerificationTier =
    current?.verification_tier === 'fully_verified' ? 'fully_verified' : 'phone_verified'

  // Include email and full_name so the upsert can create the row if the trigger didn't fire
  const fullName = (authUser?.user_metadata?.full_name as string | undefined) ?? ''
  const email = authUser?.email ?? user.email ?? ''
  const userTypeFromMeta = (authUser?.user_metadata?.user_type as string | undefined) ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upsertPayload: any = {
    id: user.id,
    email,
    full_name: fullName,
    phone: normalized,
    phone_verified: true,
    verification_tier: newTier,
    // Only set user_type if the row doesn't exist yet (avoid overwriting existing value)
    ...(current === null && userTypeFromMeta ? { user_type: userTypeFromMeta } : {}),
  }

  const { data: upsertData, error: upsertError } = await admin
    .from('users')
    .upsert(upsertPayload, { onConflict: 'id' })
    .select()

  console.log('Upsert data:', JSON.stringify(upsertData, null, 2))
  console.log('Upsert error:', JSON.stringify(upsertError, null, 2))

  if (upsertError) {
    return { success: false, error: 'Failed to save your phone number. Please try again.' }
  }

  // Resolve user_type: prefer existing DB value, fall back to signup metadata
  const userType = (current?.user_type ?? userTypeFromMeta) as string | null

  if (userType === 'trade') {
    redirect('/onboarding/trade')
  } else if (userType === 'client_business') {
    redirect('/onboarding/business')
  } else {
    redirect('/onboarding/individual')
  }
}
