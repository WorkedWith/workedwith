'use server'

import { sendEmail } from '@/lib/email/send'
import { inviteClaimed } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteMatchesUser } from '@/lib/invite-match'
import type { PendingInvite } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type ClaimTradeInviteResult =
  | { success: true; jobIds: string[]; claimedCount: number }
  | { success: false; error: string; code: 'invalid' | 'expired' | 'already_claimed' | 'no_match' | 'no_profile' | 'server_error' }

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
  if (!inviteMatchesUser(invite, userData as unknown as { email: string | null; phone: string | null; phone_verified: boolean })) {
    return {
      success: false,
      error: 'This request was sent to a different account. Sign in with the email or phone number the client used.',
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

  // Each request is accepted or declined on its own.
  const invitesToClaim: PendingInvite[] = [invite]

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

      const notifPromises: PromiseLike<unknown>[] = [
        admin.from('notifications').insert({
          user_id: inv.inviting_client_id,
          type: 'job_confirmed',
          title: 'Your job invite has been claimed',
          body: `${tradeName} has claimed your ${inv.job_type} invite for ${inv.job_date}. You can now leave each other reviews.`,
          link: `/jobs/${job.id}/review`,
        }),
      ]

      if (clientUser?.email) {
        notifPromises.push(
          sendEmail(clientUser.email, inviteClaimed({
            tradeName,
            jobType: inv.job_type,
            jobDate: inv.job_date,
            jobId: job.id,
          })).then(r => {
            if (!r.ok) console.error('Claim email failed (non-fatal):', r.error)
          }),
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
