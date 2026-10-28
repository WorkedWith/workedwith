'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_RESPONSE_CHARS } from '@/lib/review-response'
import { canActForReviewee } from '@/lib/org-access'

export type RespondResult = { success: true } | { success: false; error: string }

export async function respondToReview(reviewId: string, text: string): Promise<RespondResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const trimmed = text.trim()
  if (!trimmed) return { success: false, error: 'Write your response first.' }
  if (trimmed.length > MAX_RESPONSE_CHARS) {
    return { success: false, error: `Keep it to ${MAX_RESPONSE_CHARS} characters or fewer.` }
  }

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('phone_verified, full_name').eq('id', user.id).maybeSingle()
  if (!me?.phone_verified) return { success: false, error: 'Verify your phone number first.' }

  const { data: review } = await admin.from('reviews').select('*').eq('id', reviewId).maybeSingle()
  if (!review) return { success: false, error: 'Review not found.' }
  if (!(await canActForReviewee(admin, user.id, review.reviewee_id as string))) {
    return { success: false, error: 'You can only respond to reviews written about you or your business.' }
  }
  if (!(review.is_visible as boolean)) {
    return { success: false, error: 'This review is not published yet.' }
  }
  if (review.response_text) {
    return { success: false, error: 'You have already responded to this review. Responses are permanent.' }
  }

  // Only set it if nobody got there first
  const { data: updated, error } = await admin
    .from('reviews')
    .update({ response_text: trimmed, response_submitted_at: new Date().toISOString() })
    .eq('id', reviewId)
    .is('response_text', null)
    .select('id')
  if (error || !updated || updated.length === 0) {
    return { success: false, error: 'Could not save your response. Please try again.' }
  }

  const reviewerId = review.reviewer_id as string | null
  if (reviewerId) {
    const name = (me.full_name as string | null) ?? 'The other party'
    const { error: nErr } = await admin.from('notifications').insert({
      user_id: reviewerId,
      type: 'review_response',
      title: `${name} responded to your review`,
      body: trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed,
      link: `/jobs/${review.job_id as string}`,
    })
    if (nErr) console.error('Review response notification failed (non-fatal):', nErr.message)
  }
  return { success: true }
}
