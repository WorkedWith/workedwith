'use server'

import { sendEmail } from '@/lib/email/send'
import { disputeRaised } from '@/lib/email/templates'
import { formatDateLong } from '@/lib/email/format'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DisputeReason } from '@/types/database'
import { getUserTier, isProTier } from '@/lib/stripe/get-tier'

// ── Types ─────────────────────────────────────────────────────

export type RaiseDisputeResult =
  | { success: true; disputeId: string }
  | { success: false; error: string; field?: 'reason' | 'details' }

// ── Action ────────────────────────────────────────────────────

export async function raiseDispute(
  reviewId: string,
  reason: DisputeReason,
  details: string,
): Promise<RaiseDisputeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()

  // Validate inputs
  const trimmedDetails = details.trim()
  if (!reason) return { success: false, error: 'Please select a reason.', field: 'reason' }
  if (!trimmedDetails) return { success: false, error: 'Please provide details.', field: 'details' }
  if (trimmedDetails.length > 1000) {
    return { success: false, error: 'Details must be 1000 characters or fewer.', field: 'details' }
  }

  // Fetch review + raiser tier in parallel
  const [{ data: review }, tier] = await Promise.all([
    admin.from('reviews').select('*').eq('id', reviewId).maybeSingle(),
    getUserTier(user.id),
  ])
  if (!review) return { success: false, error: 'Review not found.' }

  // Must be the reviewee
  if ((review.reviewee_id as string) !== user.id) {
    return { success: false, error: 'You can only dispute reviews that are written about you.' }
  }

  // Review must be published
  if (!(review.is_visible as boolean)) {
    return { success: false, error: 'This review is not yet published.' }
  }

  // No existing dispute
  if ((review.dispute_status as string) !== 'none') {
    return { success: false, error: 'A dispute has already been raised for this review.' }
  }

  // 14 day window runs from when the review went live (falls back to submission)
  const { data: reviewWindow } = await admin
    .from('review_windows')
    .select('both_submitted_at')
    .eq('job_id', review.job_id as string)
    .maybeSingle()
  const liveSince = (reviewWindow?.both_submitted_at as string | null | undefined) ?? (review.submitted_at as string)
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
  if (Date.now() - new Date(liveSince).getTime() > fourteenDaysMs) {
    return { success: false, error: 'The 14 day dispute window for this review has closed.' }
  }

  const respondentId = review.reviewer_id as string | null

  if (!respondentId) {
    return {
      success: false,
      error: 'The author of this review has closed their account, so it can no longer be disputed. Contact support if you need help.',
    }
  }

  const isPriority = isProTier(tier)

  // Create dispute
  const { data: dispute, error: insertErr } = await admin
    .from('disputes')
    .insert({
      review_id: reviewId,
      raised_by: user.id,
      reason,
      details: trimmedDetails,
      respondent_id: respondentId,
      is_priority: isPriority,
    })
    .select('*')
    .single()

  if (insertErr || !dispute) {
    return { success: false, error: 'Failed to raise dispute. Please try again.' }
  }

  // Mark review as under dispute
  await admin.from('reviews').update({ dispute_status: 'open' }).eq('id', reviewId)

  // Gather names for notifications
  const [{ data: raiserUser }, { data: respondentUser }] = await Promise.all([
    admin.from('users').select('full_name').eq('id', user.id).single(),
    admin.from('users').select('*').eq('id', respondentId).single(),
  ])

  const raiserName = (raiserUser?.full_name as string | null | undefined) ?? 'The other party'
  const evidenceDeadline = dispute.evidence_deadline as string

  const tasks: PromiseLike<unknown>[] = [
    admin.from('notifications').insert({
      user_id: respondentId,
      type: 'dispute_raised',
      title: 'A dispute has been raised on your review',
      body: `${raiserName} has raised a dispute on the review you left. You have 7 days to submit your evidence.`,
      link: `/reviews/${reviewId}/dispute/evidence`,
    }),
  ]

  if (respondentUser?.email) {
    tasks.push(
      sendEmail(respondentUser.email as string, disputeRaised({
        raiserName,
        deadline: formatDateLong(evidenceDeadline) ?? evidenceDeadline,
        reviewId,
      })).then(r => {
        if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
      })
    )
  }

  await Promise.all(tasks)

  return { success: true, disputeId: dispute.id as string }
}
