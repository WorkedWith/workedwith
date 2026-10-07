'use server'

import { APP_URL } from '@/lib/app-url'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PendingInvite } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type ClaimTradeInviteResult =
  | { success: true; jobIds: string[]; claimedCount: number }
  | { success: false; error: string; code: 'invalid' | 'expired' | 'already_claimed' | 'no_match' | 'no_profile' | 'server_error' }

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

function inviteClaimedHtml(p: { tradeName: string; jobType: string; jobDate: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Your invite has been claimed</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.tradeName}</strong> has claimed your <strong>${p.jobType}</strong> invite
      for <strong>${p.jobDate}</strong>. You can both now leave mutual verified reviews.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
      <a href="${p.jobUrl}" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">View job &amp; leave a review</a>
    </td></tr></table>
  `)
}

// ── Action ────────────────────────────────────────────────────

export async function claimTradeInvite(claimToken: string): Promise<ClaimTradeInviteResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in to claim this invite.', code: 'invalid' }

  const admin = createAdminClient()

  // Load the target invite
  const { data: rawInvite } = await admin
    .from('pending_invites')
    .select('*')
    .eq('claim_token', claimToken)
    .maybeSingle()

  if (!rawInvite) {
    return { success: false, error: 'Invite not found or already removed.', code: 'invalid' }
  }

  const invite = rawInvite as unknown as PendingInvite

  if (invite.status === 'claimed') {
    return {
      success: false,
      error: 'This invite has already been claimed.',
      code: 'already_claimed',
    }
  }

  if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'This invite has expired.', code: 'expired' }
  }

  // Load claiming user's data
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData) return { success: false, error: 'User not found.', code: 'server_error' }

  // Verify the claiming user matches the invite contact
  const phoneMatch = invite.contact_phone && userData.phone === invite.contact_phone && userData.phone_verified
  const emailMatch = !invite.contact_phone && invite.contact_email && userData.email === invite.contact_email

  if (!phoneMatch && !emailMatch) {
    return {
      success: false,
      error: invite.contact_phone
        ? 'This invite was sent to a different phone number. Sign in with the account that has that number verified.'
        : 'This invite was sent to a different email address. Sign in with that email account to claim it.',
      code: 'no_match',
    }
  }

  // Claiming user must have a trade profile
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id, user_id, company_name, total_jobs')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) {
    return { success: false, error: 'A trade profile is required to claim this invite.', code: 'no_profile' }
  }

  // Collect all stacked invites (same contact_phone or contact_email, still sent)
  const invitesToClaim: PendingInvite[] = [invite]

  if (invite.contact_phone) {
    const { data: stacked } = await admin
      .from('pending_invites')
      .select('*')
      .eq('contact_phone', invite.contact_phone)
      .eq('status', 'sent')
      .neq('id', invite.id)
    if (stacked) invitesToClaim.push(...(stacked as unknown as PendingInvite[]))
  }

  if (invite.contact_email) {
    const { data: stacked } = await admin
      .from('pending_invites')
      .select('*')
      .eq('contact_email', invite.contact_email)
      .eq('status', 'sent')
      .neq('id', invite.id)
    if (stacked) {
      const existingIds = new Set(invitesToClaim.map(i => i.id))
      for (const s of stacked as unknown as PendingInvite[]) {
        if (!existingIds.has(s.id)) invitesToClaim.push(s)
      }
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const tradeName =
    (tradeProfile as { company_name: string | null }).company_name ?? userData.full_name
  const claimedAt = new Date().toISOString()
  const jobIds: string[] = []
  const blindWindowCloses = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const reviewWindowCloses = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  for (const inv of invitesToClaim) {
    try {
      // Look up inviting client's profile
      const { data: clientProfile } = await admin
        .from('client_profiles')
        .select('id, user_id, display_name, company_name')
        .eq('user_id', inv.inviting_client_id)
        .maybeSingle()

      if (!clientProfile) continue

      // Create the confirmed job
      const { data: job, error: jobErr } = await admin
        .from('jobs')
        .insert({
          job_type: inv.job_type,
          trade_profile_id: tradeProfile.id,
          client_profile_id: clientProfile.id,
          initiated_by: 'client',
          description: inv.description ?? null,
          is_backdated: true,
          backdated_period: inv.job_date,
          status: 'active',
          confirmed_at: claimedAt,
        })
        .select('id')
        .single()

      if (jobErr || !job) continue

      jobIds.push(job.id)

      // Open the review window
      await admin.from('review_windows').insert({
        job_id: job.id,
        window_opened_at: claimedAt,
        blind_window_closes_at: blindWindowCloses,
        window_closes_at: reviewWindowCloses,
        trade_review_submitted: false,
        client_review_submitted: false,
      })

      // Mark invite as claimed
      await admin
        .from('pending_invites')
        .update({
          status: 'claimed',
          claimed_by_user_id: user.id,
          claimed_at: claimedAt,
          resulting_job_id: job.id,
        })
        .eq('id', inv.id)

      // Notify inviting client
      const clientUser = (await admin.from('users').select('id, email, full_name').eq('id', inv.inviting_client_id).single()).data
      const jobUrl = `${APP_URL}/jobs/${job.id}`

      const notifPromises: PromiseLike<unknown>[] = [
        admin.from('notifications').insert({
          user_id: inv.inviting_client_id,
          type: 'job_confirmed',
          title: 'Your job invite has been claimed',
          body: `${tradeName} has claimed your ${inv.job_type} invite for ${inv.job_date}. You can now leave each other reviews.`,
          link: `/jobs/${job.id}`,
        }),
      ]

      if (clientUser?.email) {
        notifPromises.push(
          resend.emails
            .send({
              from: 'WorkedWith <hello@workedwith.co.uk>',
              to: clientUser.email,
              subject: `${tradeName} has claimed your WorkedWith job invite`,
              html: inviteClaimedHtml({
                tradeName,
                jobType: inv.job_type,
                jobDate: inv.job_date,
                jobUrl,
              }),
            })
            .catch((e: unknown) => console.error('Claim email failed (non-fatal):', e)),
        )
      }

      await Promise.all(notifPromises)
    } catch (err) {
      console.error(`Failed to process invite ${inv.id}:`, err)
    }
  }

  if (jobIds.length > 0) {
    // Update trade profile job count once, after all stacked invites are processed
    await admin
      .from('trade_profiles')
      .update({ total_jobs: ((tradeProfile as { total_jobs: number }).total_jobs ?? 0) + jobIds.length })
      .eq('id', tradeProfile.id)
  }

  if (jobIds.length === 0) {
    return { success: false, error: 'Failed to process the claim. Please try again.', code: 'server_error' }
  }

  return { success: true, jobIds, claimedCount: jobIds.length }
}
