import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalisePhone } from '@/lib/seeded-hash'

export async function POST(request: Request) {
  try {
    const { phone } = (await request.json()) as { phone: string }
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number required.' }, { status: 400 })
    }

    const normPhone = normalisePhone(phone)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const admin = createAdminClient()

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    // Fail closed: if either count query errors, block the send
    const [
      { count: phoneCount, error: phoneErr },
      { count: ipCount, error: ipErr },
    ] = await Promise.all([
      admin
        .from('rate_limit_events')
        .select('id', { count: 'exact', head: true })
        .eq('key', `otp_send:phone:${normPhone}`)
        .gte('created_at', tenMinsAgo),
      admin
        .from('rate_limit_events')
        .select('id', { count: 'exact', head: true })
        .eq('key', `otp_send:ip:${ip}`)
        .gte('created_at', oneHourAgo),
    ])

    if (phoneErr || ipErr) {
      console.error('send-otp rate-limit read error:', { phoneErr, ipErr })
      return NextResponse.json(
        { success: false, error: 'Could not send the verification code. Please try again.' },
        { status: 500 },
      )
    }

    if ((phoneCount ?? 0) >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many codes sent to this number. Please wait 10 minutes before trying again.' },
        { status: 429 },
      )
    }
    if ((ipCount ?? 0) >= 10) {
      return NextResponse.json(
        { success: false, error: 'Too many verification requests from your location. Please try again later.' },
        { status: 429 },
      )
    }

    // Record attempt BEFORE calling Twilio so retries and failures count
    const { error: insertErr } = await admin.from('rate_limit_events').insert([
      { key: `otp_send:phone:${normPhone}` },
      { key: `otp_send:ip:${ip}` },
    ])

    if (insertErr) {
      console.error('send-otp rate-limit insert error:', insertErr)
      return NextResponse.json(
        { success: false, error: 'Could not send the verification code. Please try again.' },
        { status: 500 },
      )
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: normPhone, channel: 'sms' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('seeded-claim send-otp error:', err)
    return NextResponse.json({ success: false, error: 'Could not send the verification code.' }, { status: 500 })
  }
}
