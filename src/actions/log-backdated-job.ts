'use server'

import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { pastJobExisting, pastJobNew } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_TRADE_TERMS } from '@/lib/trade-types'
import type { JobInitiatedBy, RedFlagReason } from '@/types/database'
import { aJobLabel } from '@/lib/trade-types'

// ── Types ─────────────────────────────────────────────────────

export type ReviewInput = {
  overall_rating: number
  quality_score?: number
  reliability_score?: number
  value_score?: number
  payment_score?: number
  scope_clarity_score?: number
  site_access_score?: number
  communication_score?: number
  would_work_again?: boolean | null
  written_review?: string
  red_flag?: boolean
  red_flag_reason?: RedFlagReason
}

export type LogBackdatedJobInput = {
  job_type: string
  description: string
  postcode: string
  backdated_period: string
  invitee_email: string
  invitee_phone: string
  initiated_by: JobInitiatedBy
  review?: ReviewInput
}

export type LogBackdatedJobResult =
  | { success: true; jobId: string; inviteeSentTo: string; reviewSaved: boolean }
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

// ── Action ────────────────────────────────────────────────────

export async function logBackdatedJob(input: LogBackdatedJobInput): Promise<LogBackdatedJobResult> {
  const h = await headers()
  const logged_from_ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  const logged_from_user_agent = h.get('user-agent') ?? null

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
  if (!(ALL_TRADE_TERMS as readonly string[]).includes(job_type)) {
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
      logged_from_ip,
      logged_from_user_agent,
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

  // Save review immediately if provided and invitee is already on the platform
  let reviewSaved = false
  if (input.review && existingUser) {
    const r = input.review
    const reviewerType = input.initiated_by
    const revieweeType = input.initiated_by === 'trade' ? 'client' : 'trade'
    const { error: reviewErr } = await admin.from('reviews').insert({
      job_id: job.id,
      reviewer_id: user.id,
      reviewee_id: existingUser.id,
      reviewer_type: reviewerType,
      reviewee_type: revieweeType,
      overall_rating: r.overall_rating,
      quality_score: r.quality_score ?? null,
      reliability_score: r.reliability_score ?? null,
      value_score: r.value_score ?? null,
      payment_score: r.payment_score ?? null,
      scope_clarity_score: r.scope_clarity_score ?? null,
      site_access_score: r.site_access_score ?? null,
      communication_score: r.communication_score ?? null,
      would_work_again: r.would_work_again ?? null,
      written_review: r.written_review?.trim() || null,
      red_flag: r.red_flag ?? false,
      red_flag_reason: r.red_flag ? (r.red_flag_reason ?? null) : null,
      is_backdated: true,
      is_visible: false,
    })
    if (!reviewErr) {
      const blindWindowCloses = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await admin.from('review_windows').insert({
        job_id: job.id,
        window_opened_at: new Date().toISOString(),
        blind_window_closes_at: blindWindowCloses,
        trade_review_submitted: input.initiated_by === 'trade',
        client_review_submitted: input.initiated_by === 'client',
      })
      reviewSaved = true
    }
  }

  const inviteToken = invite.invite_token ?? ''
  const emailTo = invitee_email ?? existingUser?.email ?? null
  const inviteeSentTo = invitee_email ?? invitee_phone ?? ''

  if (emailTo) {
    const period = backdated_period
    if (existingUser) {
      // Existing user: send straight to the confirm page
      await Promise.all([
        admin.from('notifications').insert({
          user_id: existingUser.id,
          type: 'job_invite',
          title: 'Past job to confirm',
          body: `${callerName} says you worked together on ${aJobLabel(job_type)} in ${period}. Confirm it to leave reviews.`,
          link: `/jobs/confirm/${inviteToken}`,
        }),
        sendEmail(emailTo, pastJobExisting({ callerName, jobType: job_type, period, token: inviteToken })).then(r => {
          if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
        }),
      ])
    } else {
      // New user: send to the branded invite landing page
      const r = await sendEmail(emailTo, pastJobNew({ callerName, jobType: job_type, period, token: inviteToken }))
      if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
    }
  }

  return { success: true, jobId: job.id, inviteeSentTo, reviewSaved }
}
