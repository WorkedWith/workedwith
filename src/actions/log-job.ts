'use server'

import { headers } from 'next/headers'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'

// ── Types ─────────────────────────────────────────────────────

export type LogJobInput = {
  job_type: string
  description: string
  postcode: string
  started_at: string
  invitee_email: string
  invitee_phone: string
  agreed_payment_terms_days: string
}

export type LogJobResult =
  | { success: true; jobId: string; inviteeSentTo: string }
  | { success: false; error: string; field?: keyof LogJobInput }

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

type EmailParams = { tradeName: string; jobType: string; postcode: string; startedAt: string | null; confirmUrl: string }

function existingClientHtml(p: EmailParams): string {
  const start = p.startedAt ? `, starting around <strong>${new Date(p.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>` : ''
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">You have a job to confirm</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.tradeName}</strong> has logged a <strong>${p.jobType}</strong> job at <strong>${p.postcode}</strong>${start} and wants you to confirm it on WorkedWith.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#6B7280;line-height:1.6;">Confirming lets both parties leave verified reviews once the work is done.</p>
    ${cta('Confirm this job', p.confirmUrl)}
    <p style="margin:0;font-size:12px;color:#9CA3AF;">This invitation expires in 7 days. If you weren&apos;t expecting this, you can safely ignore it.</p>
  `)
}

function newUserHtml(p: EmailParams): string {
  const start = p.startedAt ? `, starting around <strong>${new Date(p.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>` : ''
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">You&apos;ve been mentioned on WorkedWith</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.tradeName}</strong> has logged a <strong>${p.jobType}</strong> job at <strong>${p.postcode}</strong>${start} and listed you as the client.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;">WorkedWith is a trust and review platform for the UK trades industry. Create a free account to confirm this job and leave a review when the work is done.</p>
    ${cta('Join WorkedWith and confirm', p.confirmUrl)}
    <p style="margin:0;font-size:12px;color:#9CA3AF;">This invitation expires in 7 days. If you weren&apos;t expecting this, you can safely ignore it.</p>
  `)
}

// ── Action ────────────────────────────────────────────────────

export async function logJob(input: LogJobInput): Promise<LogJobResult> {
  const h = await headers()
  const logged_from_ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  const logged_from_user_agent = h.get('user-agent') ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || userData.verification_tier === 'unverified') {
    return { success: false, error: 'Phone verification is required to log jobs.' }
  }

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) {
    return { success: false, error: 'You need a trade profile to log jobs. Please complete your trade onboarding first.' }
  }

  // Normalise
  const job_type = input.job_type.trim()
  const description = input.description.trim()
  const postcode = input.postcode.trim().toUpperCase()
  const started_at = input.started_at.trim() || null
  const invitee_email = input.invitee_email.trim().toLowerCase() || null
  const invitee_phone_raw = input.invitee_phone.trim() || null
  const invitee_phone = invitee_phone_raw ? normalizeUKMobile(invitee_phone_raw) : null
  const agreedRaw = input.agreed_payment_terms_days
  const agreed_payment_terms_days = agreedRaw !== '' ? parseInt(agreedRaw, 10) : null

  // Validate
  if (!(TRADE_TYPES as readonly string[]).includes(job_type)) {
    return { success: false, error: 'Please select a valid job type.', field: 'job_type' }
  }
  if (!postcode) {
    return { success: false, error: 'Please enter the job postcode.', field: 'postcode' }
  }
  if (!UK_POSTCODE_RE.test(postcode)) {
    return { success: false, error: 'Please enter a valid UK postcode.', field: 'postcode' }
  }
  if (description.length > 500) {
    return { success: false, error: 'Description must be 500 characters or fewer.', field: 'description' }
  }
  if (!invitee_email && !invitee_phone_raw) {
    return { success: false, error: "Please enter the client's email address or phone number.", field: 'invitee_email' }
  }
  if (invitee_email && !EMAIL_RE.test(invitee_email)) {
    return { success: false, error: 'Please enter a valid email address.', field: 'invitee_email' }
  }
  if (invitee_phone_raw && !invitee_phone) {
    return { success: false, error: 'Please enter a valid UK mobile number (e.g. 07700 900000).', field: 'invitee_phone' }
  }

  // Create job
  const { data: job, error: jobErr } = await admin
    .from('jobs')
    .insert({
      trade_profile_id: tradeProfile.id,
      initiated_by: 'trade',
      job_type,
      description: description || null,
      postcode,
      started_at: started_at ?? undefined,
      agreed_payment_terms_days: (agreed_payment_terms_days !== null && !isNaN(agreed_payment_terms_days))
        ? agreed_payment_terms_days
        : null,
      logged_from_ip,
      logged_from_user_agent,
    })
    .select('*')
    .single()

  if (jobErr || !job) {
    return { success: false, error: 'Failed to create job. Please try again.' }
  }

  // Create job invite (invite_token, status, sent_at, expires_at all use DB defaults)
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
    return { success: false, error: 'Failed to create job invite. Please try again.' }
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

  const tradeName = tradeProfile.company_name ?? userData.full_name
  const inviteToken = invite.invite_token ?? ''
  const resend = new Resend(process.env.RESEND_API_KEY)

  const emailTo = invitee_email ?? existingUser?.email ?? null
  const inviteeSentTo = invitee_email ?? invitee_phone ?? ''

  if (emailTo) {
    if (existingUser) {
      // Existing user: send straight to the confirm page
      const emailParams: EmailParams = {
        tradeName, jobType: job_type, postcode, startedAt: started_at,
        confirmUrl: `https://workedwith.co.uk/jobs/confirm/${inviteToken}`,
      }
      await Promise.all([
        resend.emails.send({
          from: 'WorkedWith <hello@workedwith.co.uk>',
          to: emailTo,
          subject: `${tradeName} wants to confirm a job with you on WorkedWith`,
          html: existingClientHtml(emailParams),
        }),
        admin.from('notifications').insert({
          user_id: existingUser.id,
          type: 'job_invite',
          title: 'New job to confirm',
          body: `${tradeName} has logged a ${job_type} job and wants you to confirm it.`,
          link: `/jobs/confirm/${inviteToken}`,
        }),
      ])
    } else {
      // New user: send to the branded invite landing page
      const emailParams: EmailParams = {
        tradeName, jobType: job_type, postcode, startedAt: started_at,
        confirmUrl: `https://workedwith.co.uk/invite/job/${inviteToken}`,
      }
      await resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>',
        to: emailTo,
        subject: `${tradeName} has logged a job with you — join WorkedWith to confirm it`,
        html: newUserHtml(emailParams),
      })
    }
  }

  return { success: true, jobId: job.id, inviteeSentTo }
}
