'use server'

import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { jobInviteNewClient, jobToConfirmExisting } from '@/lib/email/templates'
import { outwardCode } from '@/lib/email/format'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'
import { aJobLabel } from '@/lib/trade-types'

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

  const emailTo = invitee_email ?? existingUser?.email ?? null
  const inviteeSentTo = invitee_email ?? invitee_phone ?? ''

  if (emailTo) {
    if (existingUser) {
      // Existing user: send straight to the confirm page
      await Promise.all([
        admin.from('notifications').insert({
          user_id: existingUser.id,
          type: 'job_invite',
          title: 'New job to confirm',
          body: `${tradeName} has logged ${aJobLabel(job_type)} and wants you to confirm it.`,
          link: `/jobs/confirm/${inviteToken}`,
        }),
        sendEmail(emailTo, jobToConfirmExisting({ tradeName, jobType: job_type, postcode, token: inviteToken })).then(r => {
          if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
        }),
      ])
    } else {
      // New user: send to the branded invite landing page. Only the district is shown.
      const r = await sendEmail(
        emailTo,
        jobInviteNewClient({ tradeName, jobType: job_type, district: outwardCode(postcode), token: inviteToken }),
      )
      if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
    }
  }

  return { success: true, jobId: job.id, inviteeSentTo }
}
