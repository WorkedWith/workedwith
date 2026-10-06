import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SeededProfile } from '@/types/database'

export async function POST(request: Request) {
  try {
    const { phone, code, token } = (await request.json()) as {
      phone: string
      code: string
      token: string
    }

    if (!phone || !code || !token) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 })
    }

    // Verify the seeded profile and that the phone matches
    const admin = createAdminClient()
    const { data: raw } = await admin
      .from('seeded_profiles')
      .select('*')
      .eq('claim_token', token)
      .maybeSingle()

    if (!raw) {
      return NextResponse.json({ success: false, error: 'Listing not found.' }, { status: 404 })
    }

    const profile = raw as unknown as SeededProfile

    if (profile.status !== 'unclaimed') {
      return NextResponse.json({ success: false, error: 'This listing has already been claimed or removed.' }, { status: 410 })
    }

    if (new Date(profile.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'This listing has expired.' }, { status: 410 })
    }

    if (profile.contact_phone !== phone) {
      return NextResponse.json({ success: false, error: 'Phone number does not match this listing.' }, { status: 400 })
    }

    // Check OTP with Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phone, code })

    if (check.status !== 'approved') {
      return NextResponse.json({ success: false, error: 'Incorrect code. Please try again.' })
    }

    const redirectTo = `/join/trade?seeded_token=${encodeURIComponent(token)}`
    return NextResponse.json({ success: true, redirectTo })
  } catch (err) {
    console.error('seeded-claim verify-otp error:', err)
    return NextResponse.json({ success: false, error: 'Verification failed. Please try again.' }, { status: 500 })
  }
}
