'use server'

import { randomBytes } from 'crypto'
import twilio from 'twilio'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'

// ── Types ─────────────────────────────────────────────────────

export type InviteTradeInput = {
  trade_name: string
  job_type: string
  description?: string
  job_date: string
  contact_phone?: string
  contact_email?: string
}

export type InviteTradeResult =
  | { success: true; inviteId: string; stackedCount: number; warning?: string }
  | { success: false; error: string; field?: keyof InviteTradeInput }

// ── Helpers ───────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeUKMobile(raw: string): string | null {
  const c = raw.replace(/[\s\-().]/g, '')
  if (/^\+447\d{9}$/.test(c)) return c
  if (/^07\d{9}$/.test(c)) return '+44' + c.slice(1)
  return null
}

// ── Email template ────────────────────────────────────────────

function emailShell(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0F1F3D;padding:24px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Worked<span style="color:#F59E0B;">With</span></span>
</td></tr>
<tr><td style="padding:32px 28px;">${body}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #F3F4F6;">
  <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">WorkedWith &bull; hello@workedwith.co.uk</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function claimInviteHtml(p: {
  callerName: string
  jobType: string
  jobDate: string
  claimUrl: string
}): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">${p.callerName} worked with you</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.callerName}</strong> has logged a <strong>${p.jobType}</strong> job with you
      in <strong>${p.jobDate}</strong> on WorkedWith.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;">
      WorkedWith is a trust and review platform for the UK trades industry. Claim this job to confirm it
      happened and leave mutual verified reviews. Nothing is published until you verify.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
      <a href="${p.claimUrl}" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">Claim this job</a>
    </td></tr></table>
    <p style="margin:0;font-size:12px;color:#9CA3AF;">This invitation expires in 60 days. If you don&apos;t recognise this, you can safely ignore it &mdash; nothing will be published.</p>
  `)
}

// ── Action ────────────────────────────────────────────────────

export async function inviteTrade(input: InviteTradeInput): Promise<InviteTradeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData) return { success: false, error: 'User not found.' }
  if (!userData.phone_verified) {
    return { success: false, error: 'Phone verification is required to send invites.' }
  }

  // Must be a client
  const { data: clientProfile } = await admin
    .from('client_profiles')
    .select('id, display_name, company_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clientProfile) {
    return { success: false, error: 'A client profile is required to invite tradespeople.' }
  }

  // Normalise
  const trade_name = input.trade_name.trim()
  const job_type = input.job_type.trim()
  const description = input.description?.trim() || null
  const job_date = input.job_date.trim()
  const contact_email = input.contact_email?.trim().toLowerCase() || null
  const contact_phone_raw = input.contact_phone?.trim() || null
  const contact_phone = contact_phone_raw ? normalizeUKMobile(contact_phone_raw) : null

  // Validate
  if (!trade_name) {
    return { success: false, error: 'Please enter the trade or company name.', field: 'trade_name' }
  }
  if (trade_name.length > 100) {
    return { success: false, error: 'Trade name must be 100 characters or fewer.', field: 'trade_name' }
  }
  if (!job_type || !(TRADE_TYPES as readonly string[]).includes(job_type)) {
    return { success: false, error: 'Please select a valid job type.', field: 'job_type' }
  }
  if (!job_date) {
    return { success: false, error: 'Please select the approximate job date.', field: 'job_date' }
  }
  if (description && description.length > 500) {
    return { success: false, error: 'Description must be 500 characters or fewer.', field: 'description' }
  }
  if (!contact_email && !contact_phone_raw) {
    return { success: false, error: 'Please enter an email address or mobile number.', field: 'contact_email' }
  }
  if (contact_email && !EMAIL_RE.test(contact_email)) {
    return { success: false, error: 'Please enter a valid email address.', field: 'contact_email' }
  }
  if (contact_phone_raw && !contact_phone) {
    return {
      success: false,
      error: 'Please enter a valid UK mobile number (e.g. 07700 900000).',
      field: 'contact_phone',
    }
  }

  // Rate limit: max 10 sent (unclaimed) invites per client per 24 hours
  const { count: recentCount } = await admin
    .from('pending_invites')
    .select('id', { count: 'exact', head: true })
    .eq('inviting_client_id', user.id)
    .eq('status', 'sent')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((recentCount ?? 0) >= 10) {
    return { success: false, error: 'You can send up to 10 invites per day. Try again tomorrow.' }
  }

  // Dedup: check for existing unclaimed invites to the same contact
  // If found, still create the record but skip re-sending the notification
  let stackedCount = 0
  let phoneStacked = false
  let emailStacked = false

  if (contact_phone) {
    const { data: existing } = await admin
      .from('pending_invites')
      .select('id')
      .eq('contact_phone', contact_phone)
      .eq('status', 'sent')
    if (existing && existing.length > 0) {
      stackedCount = existing.length
      phoneStacked = true
    }
  }

  if (contact_email) {
    const { data: existing } = await admin
      .from('pending_invites')
      .select('id')
      .eq('contact_email', contact_email)
      .eq('status', 'sent')
    if (existing && existing.length > 0) {
      stackedCount = Math.max(stackedCount, existing.length)
      emailStacked = true
    }
  }

  // Skip notifying only when every contact method given has already been notified.
  // A new email or phone on a stacked invite still gets its own message.
  const alreadyNotified =
    (!contact_phone || phoneStacked) && (!contact_email || emailStacked)

  // Insert pending invite
  const claim_token = randomBytes(32).toString('hex')
  const { data: invite, error: insertErr } = await admin
    .from('pending_invites')
    .insert({
      inviting_client_id: user.id,
      trade_name,
      job_type,
      description,
      job_date,
      contact_phone: contact_phone ?? null,
      contact_email: contact_email ?? null,
      claim_token,
    })
    .select('*')
    .single()

  if (insertErr || !invite) {
    return { success: false, error: 'Failed to create invite. Please try again.' }
  }

  // If already notified, skip sending (stacked against existing thread)
  if (alreadyNotified) {
    return { success: true, inviteId: invite.id, stackedCount }
  }

  // Send notifications
  const claimUrl = `https://workedwith.co.uk/invite/claim/${invite.claim_token}`
  const callerName =
    (clientProfile as { display_name: string | null; company_name: string | null }).display_name ??
    (clientProfile as { display_name: string | null; company_name: string | null }).company_name ??
    userData.full_name
  const resend = new Resend(process.env.RESEND_API_KEY)
  const sends: Promise<unknown>[] = []
  let smsFailed = false

  if (contact_phone && !phoneStacked && process.env.TWILIO_MESSAGING_SERVICE_SID) {
    try {
      const tw = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
      sends.push(
        tw.messages
          .create({
            body: `WorkedWith: ${callerName} has logged a ${job_type} job with you. Claim it (expires 60 days): ${claimUrl}`,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            to: contact_phone,
          })
          .catch((e: unknown) => {
            smsFailed = true
            console.error('SMS send failed (non-fatal):', e)
          }),
      )
    } catch (e) {
      smsFailed = true
      console.error('Twilio init failed:', e)
    }
  } else if (contact_phone && !phoneStacked) {
    smsFailed = true
    console.warn('TWILIO_MESSAGING_SERVICE_SID not configured, skipping invite SMS')
  }

  if (contact_email && !emailStacked) {
    sends.push(
      resend.emails
        .send({
          from: 'WorkedWith <hello@workedwith.co.uk>',
          to: contact_email,
          subject: `${callerName} has logged a job with you on WorkedWith`,
          html: claimInviteHtml({ callerName, jobType: job_type, jobDate: job_date, claimUrl }),
        })
        .catch((e: unknown) => console.error('Email send failed (non-fatal):', e)),
    )
  }

  await Promise.all(sends)

  const warning = smsFailed
    ? contact_email
      ? 'The invite was saved and emailed, but the text message could not be sent.'
      : 'The invite was saved, but the text message could not be sent. Please try again or add an email address.'
    : undefined

  return { success: true, inviteId: invite.id, stackedCount: 0, warning }
}
