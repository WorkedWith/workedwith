'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from './create-trade-profile'
import type { JobInitiatedBy } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type LogBackdatedJobInput = {
  job_type: string
  description: string
  postcode: string
  backdated_period: string
  invitee_email: string
  invitee_phone: string
  initiated_by: JobInitiatedBy
}

export type LogBackdatedJobResult =
  | { success: true; jobId: string; inviteeSentTo: string }
  | {
      success: false
      error: string
      field?: 'job_type' | 'description' | 'postcode' | 'backdated_period' | 'invitee_email' | 'invitee_phone'
    }

// ── Helpers ───────────────────────────────────────────────────

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeUKMobile(raw: string): string | null {
  const c = raw.replace(/[\s\-().]/g, '')
  if (/^\+447\d{9}$/.test(c)) return c
  if (/^07\d{9}$/.test(c)) return '+44' + c.slice(1)
  return null
}

// ── Email templates ───────────────────────────────────────────

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

function cta(label: string, href: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
  <a href="${href}" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${label}</a>
</td></tr></table>`
}

type BackdatedEmailParams = {
  callerName: string
  jobType: string
  backdatedPeriod: string
  confirmUrl: string
}

function existingUserBackdatedHtml(p: BackdatedEmailParams): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">A past job to confirm</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.callerName}</strong> worked with you as a <strong>${p.jobType}</strong> in <strong>${p.backdatedPeriod}</strong>. Confirm it on WorkedWith to leave mutual reviews.
    </p>
    ${cta('Confirm this past job', p.confirmUrl)}
    <p style="margin:0;font-size:12px;color:#9CA3AF;">This invitation expires in 14 days. If you weren&apos;t expecting this, you can safely ignore it.</p>
  `)
}

function newUserBackdatedHtml(p: BackdatedEmailParams): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">${p.callerName} worked with you</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.callerName}</strong> worked with you as a <strong>${p.jobType}</strong> in <strong>${p.backdatedPeriod}</strong> and has logged this on WorkedWith.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;">
      WorkedWith is a trust and review platform for the UK trades industry. Create a free account to confirm this past job and leave mutual verified reviews.
    </p>
    ${cta('Join WorkedWith and confirm', p.confirmUrl)}
    <p style="margin:0;font-size:12px;color:#9CA3AF;">This invitation expires in 14 days. If you weren&apos;t expecting this, you can safely ignore it.</p>
  `)
}

// ── Action ────────────────────────────────────────────────────

export async function logBackdatedJob(input: LogBackdatedJobInput): Promise<LogBackdatedJobResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || !userData.phone_verified) {
    return { success: false, error: 'Phone verification is required to log past jobs.' }
  }

  // Normalise inputs
  const job_type = input.job_type.trim()
  const description = input.description.trim()
  const postcode = input.postcode.trim().toUpperCase()
  const backdated_period = input.backdated_period.trim()
  const invitee_email = input.invitee_email.trim().toLowerCase() || null
  const invitee_phone_raw = input.invitee_phone.trim() || null
  const invitee_phone = invitee_phone_raw ? normalizeUKMobile(invitee_phone_raw) : null

  // Validate
  if (!(TRADE_TYPES as readonly string[]).includes(job_type)) {
    return { success: false, error: 'Please select a valid job type.', field: 'job_type' }
  }
  if (!postcode || !UK_POSTCODE_RE.test(postcode)) {
    return { success: false, error: 'Please enter a valid UK postcode.', field: 'postcode' }
  }
  if (!backdated_period) {
    return { success: false, error: 'Please select the approximate period.', field: 'backdated_period' }
  }
  if (description.length > 500) {
    return { success: false, error: 'Description must be 500 characters or fewer.', field: 'description' }
  }
  if (!invitee_email && !invitee_phone_raw) {
    return { success: false, error: 'Please enter an email address or phone number.', field: 'invitee_email' }
  }
  if (invitee_email && !EMAIL_RE.test(invitee_email)) {
    return { success: false, error: 'Please enter a valid email address.', field: 'invitee_email' }
  }
  if (invitee_phone_raw && !invitee_phone) {
    return {
      success: false,
      error: 'Please enter a valid UK mobile number (e.g. 07700 900000).',
      field: 'invitee_phone',
    }
  }

  // Resolve caller's profile
  let trade_profile_id: string | null = null
  let client_profile_id: string | null = null
  let callerName = userData.full_name

  if (input.initiated_by === 'trade') {
    const { data: tradeProfile } = await admin
      .from('trade_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!tradeProfile) {
      return { success: false, error: 'You need a trade profile to log past jobs.' }
    }
    trade_profile_id = tradeProfile.id
    callerName = tradeProfile.company_name ?? userData.full_name
  } else {
    const { data: clientProfile } = await admin
      .from('client_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!clientProfile) {
      return { success: false, error: 'You need a client profile to log past jobs.' }
    }
    client_profile_id = clientProfile.id
    callerName = clientProfile.display_name ?? userData.full_name
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  // Create job
  const { data: job, error: jobErr } = await admin
    .from('jobs')
    .insert({
      job_type,
      trade_profile_id,
      client_profile_id,
      initiated_by: input.initiated_by,
      description: description || null,
      postcode,
      is_backdated: true,
      backdated_period,
      status: 'pending_confirmation',
      confirmation_expires_at: expiresAt.toISOString(),
    })
    .select('*')
    .single()

  if (jobErr || !job) {
    return { success: false, error: 'Failed to create job. Please try again.' }
  }

  // Create invite
  const { data: invite, error: inviteErr } = await admin
    .from('job_invites')
    .insert({
      job_id: job.id,
      inviter_id: user.id,
      invitee_email: invitee_email ?? undefined,
      invitee_phone: invitee_phone ?? undefined,
    })
    .select('*')
    .single()

  if (inviteErr || !invite) {
    await admin.from('jobs').delete().eq('id', job.id)
    return { success: false, error: 'Failed to create invite. Please try again.' }
  }

  // Look up existing user by email or phone
  let existingUser: { id: string; email: string } | null = null
  if (invitee_email) {
    const { data } = await admin.from('users').select('*').eq('email', invitee_email).maybeSingle()
    if (data) existingUser = { id: data.id, email: data.email }
  } else if (invitee_phone) {
    const { data } = await admin.from('users').select('*').eq('phone', invitee_phone).maybeSingle()
    if (data) existingUser = { id: data.id, email: data.email }
  }

  const confirmUrl = `https://workedwith.co.uk/jobs/confirm/${invite.invite_token ?? ''}`
  const emailTo = invitee_email ?? existingUser?.email ?? null
  const inviteeSentTo = invitee_email ?? invitee_phone ?? ''
  const emailParams: BackdatedEmailParams = { callerName, jobType: job_type, backdatedPeriod: backdated_period, confirmUrl }
  const resend = new Resend(process.env.RESEND_API_KEY)

  if (emailTo) {
    if (existingUser) {
      await Promise.all([
        resend.emails.send({
          from: 'WorkedWith <hello@workedwith.co.uk>',
          to: emailTo,
          subject: `${callerName} has logged a past job you worked on together`,
          html: existingUserBackdatedHtml(emailParams),
        }),
        admin.from('notifications').insert({
          user_id: existingUser.id,
          type: 'job_invite',
          title: 'Past job to confirm',
          body: `${callerName} worked with you as a ${job_type} in ${backdated_period}. Confirm it on WorkedWith to leave mutual reviews.`,
          link: `/jobs/confirm/${invite.invite_token ?? ''}`,
        }),
      ])
    } else {
      await resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>',
        to: emailTo,
        subject: `${callerName} worked with you — join WorkedWith to confirm it`,
        html: newUserBackdatedHtml(emailParams),
      })
    }
  }

  return { success: true, jobId: job.id, inviteeSentTo }
}
