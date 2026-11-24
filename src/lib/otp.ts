import twilio from 'twilio'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Text codes for client sign in (PRD 5). Twilio Verify in production. OTP_PROVIDER=mock accepts 123456
 * and sends nothing; it is the default when Twilio Verify is not configured outside production.
 */
export const MOCK_OTP_CODE = '123456'

export function otpIsMock(): boolean {
  if (process.env.OTP_PROVIDER === 'mock') return true
  if (process.env.OTP_PROVIDER === 'twilio') return false
  return !process.env.TWILIO_VERIFY_SERVICE_SID && process.env.VERCEL_ENV !== 'production'
}

async function tooMany(admin: AdminClient, key: string, max: number, minutes: number): Promise<boolean> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString()
  const { count } = await admin.from('rate_limit_events').select('id', { count: 'exact', head: true }).eq('key', key).gte('created_at', since)
  if ((count ?? 0) >= max) return true
  await admin.from('rate_limit_events').insert({ key })
  return false
}

export async function sendOtp(admin: AdminClient, phone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await tooMany(admin, `client_otp_send:${phone}`, 5, 60)) {
    return { ok: false, error: 'Too many codes sent. Please wait an hour and try again.' }
  }
  if (otpIsMock()) {
    console.log(`[otp:mock] code for ${phone} is ${MOCK_OTP_CODE}`)
    return { ok: true }
  }
  try {
    await twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
      .verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: phone, channel: 'sms' })
    return { ok: true }
  } catch (err) {
    console.error('OTP send failed:', err)
    return { ok: false, error: 'We could not send the code. Please try again in a minute.' }
  }
}

export async function checkOtp(admin: AdminClient, phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return { ok: false, error: 'Enter the 6 number code from the text.' }
  if (await tooMany(admin, `client_otp_check:${phone}`, 8, 10)) {
    return { ok: false, error: 'Too many tries. Please ask for a new code in 10 minutes.' }
  }
  if (otpIsMock()) return clean === MOCK_OTP_CODE ? { ok: true } : { ok: false, error: 'That code is not right. Please try again.' }
  try {
    const check = await twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
      .verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phone, code: clean })
    return check.status === 'approved' ? { ok: true } : { ok: false, error: 'That code is not right. Please try again.' }
  } catch {
    return { ok: false, error: 'We could not check the code. Please try again.' }
  }
}
