import { APP_URL } from '@/lib/app-url'
import { Resend } from 'resend'
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

function emailShell(body: string, claimToken: string): string {
  const unsubUrl = removeUrl(claimToken)
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0F1F3D;padding:24px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Worked<span style="color:#F59E0B;">With</span></span>
</td></tr>
<tr><td style="padding:32px 28px;">${body}</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #F3F4F6;">
  <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;text-align:center;">
    WorkedWith &bull; hello@workedwith.co.uk
  </p>
  <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
    <a href="${unsubUrl}" style="color:#9CA3AF;">Remove this listing and stop all messages</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

type EmailParams = {
  profile: SeededProfile
  day: OutreachDay
}

function buildEmailContent({ profile, day }: EmailParams): { subject: string; html: string } {
  const claim = claimUrl(profile.claim_token)
  const remove = removeUrl(profile.claim_token)

  const ctaBlock = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center">
        <a href="${claim}" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Claim your free listing
        </a>
      </td></tr>
    </table>
    <p style="margin:0 0 12px;font-size:13px;color:#6B7280;text-align:center;">
      No obligation. If this is not your business,
      <a href="${remove}" style="color:#6B7280;">remove the page here</a>.
    </p>`

  const name = profile.business_name

  const messages: Record<OutreachDay, { subject: string; body: string }> = {
    day0: {
      subject: `${name} has a page on WorkedWith`,
      body: `
        <h1 style="margin:0 0 16px;font-size:20px;color:#0F1F3D;">Your business has a listing on WorkedWith</h1>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
          We have created a basic listing for <strong>${name}</strong> on WorkedWith, a platform where tradespeople
          build a verified work history and clients leave genuine reviews.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
          Claiming it is free. Once claimed, you can add your own details, collect verified reviews from real jobs,
          and choose whether to stay on a free account or upgrade later.
        </p>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
          If you would like to take it over, click below.
        </p>
        ${ctaBlock}`,
    },
    day21: {
      subject: `Reminder: ${name} has an unclaimed listing on WorkedWith`,
      body: `
        <h1 style="margin:0 0 16px;font-size:20px;color:#0F1F3D;">A quick reminder about your listing</h1>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
          Three weeks ago we let you know that <strong>${name}</strong> has a listing on WorkedWith.
          It is still unclaimed and sitting there waiting for you.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
          Claiming is free and takes a few minutes. You can add your own bio, collect verified reviews,
          and get found by clients searching for ${profile.trade_category} work in your area.
        </p>
        ${ctaBlock}`,
    },
    day42: {
      subject: `${name}: your WorkedWith listing expires in 18 days`,
      body: `
        <h1 style="margin:0 0 16px;font-size:20px;color:#0F1F3D;">Your listing expires in 18 days</h1>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
          The listing for <strong>${name}</strong> on WorkedWith will be removed in 18 days if it stays unclaimed.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
          Claiming is free and only takes a few minutes. Once you have claimed it, the page stays permanently
          and you can build a verified review history over time.
        </p>
        ${ctaBlock}`,
    },
    day56: {
      subject: `Final notice: ${name} listing removed in 4 days`,
      body: `
        <h1 style="margin:0 0 16px;font-size:20px;color:#0F1F3D;">Final notice: listing removed in 4 days</h1>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
          This is the last message we will send. The listing for <strong>${name}</strong> on WorkedWith
          will be permanently deleted in 4 days.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">
          If you want to keep it, claiming is free and takes a few minutes.
        </p>
        ${ctaBlock}`,
    },
  }

  const { subject, body } = messages[day]
  return { subject, html: emailShell(body, profile.claim_token) }
}

function buildSmsText(profile: SeededProfile, day: OutreachDay): string {
  const claim = claimUrl(profile.claim_token)
  const remove = removeUrl(profile.claim_token)
  const name = profile.business_name

  const texts: Record<OutreachDay, string> = {
    day0: `WorkedWith: ${name} has a free listing on WorkedWith. Claim it here: ${claim} Not yours? Remove it: ${remove}`,
    day21: `WorkedWith reminder: ${name} has an unclaimed listing. Claim free: ${claim} Remove: ${remove}`,
    day42: `WorkedWith: ${name}'s listing expires in 18 days. Claim free: ${claim} Remove: ${remove}`,
    day56: `WorkedWith final notice: ${name}'s listing is removed in 4 days. Claim free: ${claim} Remove: ${remove}`,
  }
  return texts[day]
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
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!)
      const { subject, html } = buildEmailContent({ profile, day })
      await resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>',
        to: profile.contact_email,
        subject,
        html,
        headers: {
          // Removal link leads to a confirmation page (not a direct POST endpoint),
          // so List-Unsubscribe-Post is intentionally omitted.
          'List-Unsubscribe': `<${removeUrl(profile.claim_token)}>`,
        },
      })
      return { sent: true, channel: 'email' }
    } catch (err) {
      console.error(`seeded-outreach email failed (${profile.id}, ${day}):`, err)
      return { sent: false, error: 'Email send failed' }
    }
  }

  // SMS via Twilio Messaging Service (phone-only profiles)
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    await client.messages.create({
      body: buildSmsText(profile, day),
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
      to: profile.contact_phone!,
    })
    return { sent: true, channel: 'sms' }
  } catch (err) {
    console.error(`seeded-outreach SMS failed (${profile.id}, ${day}):`, err)
    return { sent: false, error: 'SMS send failed' }
  }
}
