'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ReviewerType } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type ReviewFormData =
  | {
      status: 'ok'
      reviewerType: ReviewerType
      revieweeName: string
      jobId: string
      jobType: string
      windowCloses: string | null
      backdatedPeriod: string | null
    }
  | { status: 'already_submitted'; revieweeName: string }
  | { status: 'window_closed' }
  | { status: 'not_participant' }
  | { status: 'no_window' }
  | { status: 'job_not_complete' }
  | { status: 'auth_required' }
  | { status: 'unverified' }

// ── Action ────────────────────────────────────────────────────

export async function getReviewFormData(jobId: string): Promise<ReviewFormData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'auth_required' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData || !userData.phone_verified) return { status: 'unverified' }

  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (!job) return { status: 'not_participant' }
  if (job.status !== 'completed') return { status: 'job_not_complete' }

  const { data: reviewWindow } = await admin
    .from('review_windows')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()

  if (!reviewWindow) return { status: 'no_window' }

  if (reviewWindow.window_closes_at && new Date(reviewWindow.window_closes_at) < new Date()) {
    return { status: 'window_closed' }
  }

  // Fetch both profiles to determine caller's role
  const [{ data: tradeProfile }, { data: clientProfile }] = await Promise.all([
    job.trade_profile_id
      ? admin.from('trade_profiles').select('*').eq('id', job.trade_profile_id).single()
      : { data: null },
    job.client_profile_id
      ? admin.from('client_profiles').select('*').eq('id', job.client_profile_id).single()
      : { data: null },
  ])

  let reviewerType: ReviewerType | null = null
  if (tradeProfile?.user_id === user.id) reviewerType = 'trade'
  else if (clientProfile?.user_id === user.id) reviewerType = 'client'

  if (!reviewerType) return { status: 'not_participant' }

  // Resolve reviewee name
  let revieweeName = ''
  if (reviewerType === 'trade' && clientProfile?.user_id) {
    const { data: cu } = await admin.from('users').select('*').eq('id', clientProfile.user_id).single()
    revieweeName = clientProfile.display_name ?? cu?.full_name ?? 'the client'
  } else if (reviewerType === 'client' && tradeProfile?.user_id) {
    const { data: tu } = await admin.from('users').select('*').eq('id', tradeProfile.user_id).single()
    revieweeName = tradeProfile.company_name ?? tu?.full_name ?? 'the tradesperson'
  }

  // Check if already submitted
  const { data: existingReview } = await admin
    .from('reviews')
    .select('id')
    .eq('job_id', jobId)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  if (existingReview) {
    return { status: 'already_submitted', revieweeName }
  }

  return {
    status: 'ok',
    reviewerType,
    revieweeName,
    jobId,
    jobType: job.job_type,
    windowCloses: reviewWindow.window_closes_at,
    backdatedPeriod: job.backdated_period,
  }
}
