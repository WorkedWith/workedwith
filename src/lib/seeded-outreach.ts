import { APP_URL } from '@/lib/app-url'
import { sendEmail } from '@/lib/email/send'
import { seededOutreach } from '@/lib/email/templates'
import { seededSms } from '@/lib/sms-copy'
import { formatDateLong } from '@/lib/email/format'
import twilio from 'twilio'
import type { SeededProfile } from '@/types/database'

export type OutreachDay = 'day0' | 'day21' | 'day42' | 'day56'



// ── Helpers ───────────────────────────────────────────────────

function removeUrl(claimToken: string): string {
  return `${APP_URL}/claim/${claimToken}/remove`
}

function claimUrl(claimToken: string): string {
  return `${APP_URL}/claim/${claimToken}`
}

function seededFields(profile: SeededProfile, day: OutreachDay) {
  return {
    day,
    name: profile.business_name,
    source: profile.source_note?.trim() || 'a public business listing',
    sentOn: formatDateLong(profile.initial_invite_sent_at ?? profile.created_at) ?? '',
    removesOn: formatDateLong(profile.expires_at) ?? '',
    claimUrl: claimUrl(profile.claim_token),
    removeUrl: removeUrl(profile.claim_token),
  }
}

// ── Dispatch ──────────────────────────────────────────────────

export type OutreachResult =
  | { sent: true; channel: 'email' | 'sms' }
  | { sent: false; channel: 'disabled' }
  | { sent: false; error: string }

export async function sendSeededOutreach(
  profile: SeededProfile,
  day: OutreachDay,
): Promise<OutreachResult> {
  // Gate: all outbound sending is disabled when the flag is off or absent
  if (process.env.SEEDED_OUTREACH_ENABLED !== 'true') {
    return { sent: false, channel: 'disabled' }
  }

  if (!profile.contact_email && !profile.contact_phone) {
    return { sent: false, channel: 'disabled' }
  }

  // Prefer email when available; fall back to SMS for phone-only profiles
  if (profile.contact_email) {
    const result = await sendEmail(profile.contact_email, seededOutreach(seededFields(profile, day)), {
      headers: {
        // Removal link leads to a confirmation page (not a direct POST endpoint),
        // so List-Unsubscribe-Post is intentionally omitted.
        'List-Unsubscribe': `<${removeUrl(profile.claim_token)}>`,
      },
    })
    if (!result.ok) {
      console.error(`seeded-outreach email failed (${profile.id}, ${day}):`, result.error)
      return { sent: false, error: 'Email send failed' }
    }
    return { sent: true, channel: 'email' }
  }

  // SMS via Twilio Messaging Service (phone-only profiles)
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    await client.messages.create({
      body: seededSms({ day, name: profile.business_name, removesOn: formatDateLong(profile.expires_at) ?? '', claimUrl: claimUrl(profile.claim_token), removeUrl: removeUrl(profile.claim_token) }),
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
      to: profile.contact_phone!,
    })
    return { sent: true, channel: 'sms' }
  } catch (err) {
    console.error(`seeded-outreach SMS failed (${profile.id}, ${day}):`, err)
    return { sent: false, error: 'SMS send failed' }
  }
}
