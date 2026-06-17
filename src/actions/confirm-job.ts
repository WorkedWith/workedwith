'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ─────────────────────────────────────────────────────

export type ConfirmJobResult =
  | { success: true; tradePersonName: string }
  | {
      success: false
      error: string
      code:
        | 'invalid'
        | 'expired'
        | 'already_confirmed'
        | 'no_profile'
        | 'auth_required'
        | 'unverified'
        | 'server_error'
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

function cta(label: string, href: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
  <a href="${href}" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${label}</a>
</td></tr></table>`
}

function jobConfirmedHtml(p: { clientName: string; jobType: string; postcode: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Job confirmed</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.clientName}</strong> has confirmed your <strong>${p.jobType}</strong> job at <strong>${p.postcode}</strong> on WorkedWith.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#6B7280;line-height:1.6;">
      You&apos;ll both be asked to leave a review once you mark the job as complete.
    </p>
    ${cta('View job details', p.jobUrl)}
  `)
}

// ── Action ────────────────────────────────────────────────────

export async function confirmJob(token: string): Promise<ConfirmJobResult> {
  if (!token?.trim()) {
    return { success: false, error: 'Invalid invitation link.', code: 'invalid' }
  }

  const admin = createAdminClient()

  // Look up the invite
  const { data: invite } = await admin
    .from('job_invites')
    .select('*')
    .eq('invite_token', token.trim())
    .maybeSingle()

  if (!invite) {
    return { success: false, error: 'This invitation link is invalid or has been revoked.', code: 'invalid' }
  }

  if (invite.status !== 'pending') {
    return { success: false, error: 'This job has already been confirmed.', code: 'already_confirmed' }
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'This invitation has expired. Please ask the tradesperson to send a new invite.', code: 'expired' }
  }

  // Require authenticated, phone-verified user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to confirm a job.', code: 'auth_required' }
  }

  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || userData.verification_tier === 'unverified') {
    return { success: false, error: 'Phone verification is required before confirming a job.', code: 'unverified' }
  }

  // Confirming user needs a client profile
  const { data: clientProfile } = await admin
    .from('client_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clientProfile) {
    return {
      success: false,
      error: 'You need a client profile to confirm a job. Please complete your client onboarding first.',
      code: 'no_profile',
    }
  }

  // Fetch the job
  const { data: job } = await admin.from('jobs').select('*').eq('id', invite.job_id).single()
  if (!job) {
    return { success: false, error: 'Job not found.', code: 'invalid' }
  }

  const now = new Date().toISOString()

  // Confirm — set job active, link client profile, mark invite accepted
  const [{ error: jobErr }] = await Promise.all([
    admin.from('jobs').update({
      status: 'active',
      confirmed_at: now,
      client_profile_id: clientProfile.id,
      updated_at: now,
    }).eq('id', job.id),
    admin.from('job_invites').update({
      status: 'accepted',
      responded_at: now,
    }).eq('id', invite.id),
  ])

  if (jobErr) {
    return { success: false, error: 'Failed to confirm the job. Please try again.', code: 'server_error' }
  }

  // Fetch trade profile + owner for notification + email
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('id', job.trade_profile_id)
    .single()

  const { data: tradeUser } = tradeProfile
    ? await admin.from('users').select('*').eq('id', tradeProfile.user_id).single()
    : { data: null }

  const tradeName = tradeProfile?.company_name ?? tradeUser?.full_name ?? 'the tradesperson'
  const clientName = userData.full_name

  if (tradeUser) {
    const jobUrl = `https://workedwith.co.uk/jobs/${job.id}`
    const resend = new Resend(process.env.RESEND_API_KEY)

    await Promise.all([
      // In-app notification
      admin.from('notifications').insert({
        user_id: tradeUser.id,
        type: 'job_confirmed',
        title: 'Job confirmed',
        body: `${clientName} has confirmed your ${job.job_type} job.`,
        link: `/jobs/${job.id}`,
      }),
      // Email to tradesperson
      resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>',
        to: tradeUser.email,
        subject: `${clientName} has confirmed your job on WorkedWith`,
        html: jobConfirmedHtml({
          clientName,
          jobType: job.job_type,
          postcode: job.postcode ?? '',
          jobUrl,
        }),
      }),
    ])
  }

  return { success: true, tradePersonName: tradeName }
}
