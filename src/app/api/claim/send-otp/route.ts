import { NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: Request) {
  try {
    const { phone } = (await request.json()) as { phone: string }
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number required.' }, { status: 400 })
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: phone, channel: 'sms' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('seeded-claim send-otp error:', err)
    return NextResponse.json({ success: false, error: 'Could not send the verification code.' }, { status: 500 })
  }
}
