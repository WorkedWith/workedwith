import twilio from 'twilio'
import { deliveryIsLive } from '@/lib/delivery'

export type SendSmsResult = { ok: true; logged?: boolean } | { ok: false; error: string }

/**
 * The one way to send a one way text (Twilio Messaging, alphanumeric "WorkedWith" sender).
 * Logged, not sent, outside production. Never throws.
 */
export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  if (!deliveryIsLive()) {
    console.log(`[sms:log] to=${to} body=${body}`)
    return { ok: true, logged: true }
  }
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    await client.messages.create({ body, messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!, to })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Text send failed' }
  }
}
