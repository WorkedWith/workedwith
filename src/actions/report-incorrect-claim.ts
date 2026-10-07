'use server'

import { sendEmail } from '@/lib/email/send'
import { adminIncorrectClaim } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PendingInvite } from '@/types/database'

export type ReportIncorrectClaimResult =
  | { success: true }
  | { success: false; error: string }

export async function reportIncorrectClaim(jobId: string): Promise<ReportIncorrectClaimResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()

  // Find the pending_invite that resulted in this job
  const { data: rawInvite } = await admin
    .from('pending_invites')
    .select('*')
    .eq('resulting_job_id', jobId)
    .maybeSingle()

  if (!rawInvite) {
    return { success: false, error: 'No claim record found for this job.' }
  }

  const invite = rawInvite as unknown as PendingInvite

  if (invite.status === 'disputed') {
    return { success: false, error: 'This claim has already been reported.' }
  }

  if (invite.status !== 'claimed') {
    return { success: false, error: 'Only claimed invites can be disputed.' }
  }

  // Verify caller is one of the two parties on the job
  const isInvitingClient = invite.inviting_client_id === user.id
  const isClaimingTrade = invite.claimed_by_user_id === user.id

  if (!isInvitingClient && !isClaimingTrade) {
    return { success: false, error: 'You are not a party to this job.' }
  }

  // Mark disputed
  const { error: updateErr } = await admin
    .from('pending_invites')
    .update({ status: 'disputed' })
    .eq('id', invite.id)

  if (updateErr) {
    return { success: false, error: 'Failed to report the claim. Please try again.' }
  }

  // Alert admin by email — the null-user_id notification row is not surfaced
  // in any bell, so Resend is the only proactive signal here.
  const alert = await sendEmail('hello@workedwith.co.uk', adminIncorrectClaim({
    reportedBy: isInvitingClient ? 'the inviting client' : 'the claiming tradesperson',
    inviteId: String(invite.id),
    jobId: String(jobId),
  }))
  if (!alert.ok) console.error('Admin alert email failed (non-fatal):', alert.error)

  return { success: true }
}
