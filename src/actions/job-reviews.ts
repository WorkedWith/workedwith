'use server'

import { revalidatePath } from 'next/cache'
import { getUserSession } from '@/lib/auth/require-trade'
import { labelFor, publishWindow, type WindowReason } from '@/lib/reviews/windows'
import { notify } from '@/lib/notify'
import { logJobEvent } from '@/lib/jobs/events'
import { REVIEW_PHOTOS_LIMIT } from '@/lib/gallery-limits'
import type { RedFlagReason } from '@/types/database'

export type JobReviewInput = {
  jobId: string
  overall: number
  communication?: number
  // client reviewing the trade
  quality?: number
  reliability?: number
  value?: number
  // trade reviewing the client
  payment?: number
  scopeClarity?: number
  siteAccess?: number
  redFlag?: boolean
  redFlagReason?: RedFlagReason | null
  wouldWorkAgain?: boolean | null
  text: string
  photoPaths: string[]
}

type R = { ok: true; published: boolean } | { ok: false; error: string }

const score = (v: number | undefined) => (typeof v === 'number' && v >= 1 && v <= 5 ? Math.round(v) : null)

/**
 * Write or edit a review on a WorkedWith job (PRD 13). Hidden until both sides submit or the 14 days end.
 * The author can edit until the other side submits or the window closes; after that it is locked.
 */
export async function submitJobReview(input: JobReviewInput): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { admin, userId } = s
  const { data: job } = await admin.from('jobs').select('id, status, flow, trade_user_id, client_user_id, is_backdated').eq('id', input.jobId).maybeSingle()
  if (!job || job.flow !== 'quote') return { ok: false, error: 'Job not found.' }
  const role: 'trade' | 'client' | null = job.trade_user_id === userId ? 'trade' : job.client_user_id === userId ? 'client' : null
  if (!role) return { ok: false, error: 'You are not part of this job.' }
  const { data: w } = await admin.from('review_windows').select('*').eq('job_id', job.id).maybeSingle()
  if (!w || w.flow !== 'quote') return { ok: false, error: 'Reviews open once the job is paid, a payment is 30 days overdue, or the job is cancelled after it started.' }
  if (w.closed_at || (w.window_closes_at && new Date(w.window_closes_at) < new Date())) return { ok: false, error: 'The review window has closed.' }

  if (!score(input.overall)) return { ok: false, error: 'Pick an overall rating.' }
  const text = input.text.trim()
  if (text.length > 500) return { ok: false, error: 'Keep the review to 500 characters.' }
  if (role === 'trade' && input.redFlag && !input.redFlagReason) return { ok: false, error: 'Pick a reason for the red flag.' }
  const revieweeId = role === 'trade' ? job.client_user_id : job.trade_user_id
  if (!revieweeId) return { ok: false, error: 'The other side of this job has closed their account.' }

  const { data: mine } = await admin.from('reviews').select('id').eq('job_id', job.id).eq('reviewer_id', userId).maybeSingle()
  const { data: theirs } = await admin.from('reviews').select('id').eq('job_id', job.id).eq('reviewer_id', revieweeId).maybeSingle()
  if (mine && theirs) return { ok: false, error: 'Both reviews are in, so yours is locked. Disputes are the only route.' }

  const row = {
    job_id: job.id,
    reviewer_id: userId,
    submitted_by_user_id: userId,
    reviewee_id: revieweeId,
    reviewer_type: role,
    reviewee_type: role === 'trade' ? 'client' as const : 'trade' as const,
    overall_rating: score(input.overall),
    communication_score: score(input.communication),
    quality_score: role === 'client' ? score(input.quality) : null,
    reliability_score: role === 'client' ? score(input.reliability) : null,
    value_score: role === 'client' ? score(input.value) : null,
    payment_score: role === 'trade' ? score(input.payment) : null,
    scope_clarity_score: role === 'trade' ? score(input.scopeClarity) : null,
    site_access_score: role === 'trade' ? score(input.siteAccess) : null,
    red_flag: role === 'trade' ? !!input.redFlag : false,
    red_flag_reason: role === 'trade' && input.redFlag ? input.redFlagReason ?? null : null,
    would_work_again: input.wouldWorkAgain ?? null,
    written_review: text || null,
    is_backdated: false,
    is_visible: false,
    label: labelFor(w.opened_reason as WindowReason, job.status as string),
    updated_at: new Date().toISOString(),
  }
  let reviewId: string
  if (mine) {
    await admin.from('reviews').update(row).eq('id', mine.id)
    reviewId = mine.id as string
  } else {
    const { data: ins, error } = await admin.from('reviews').insert(row).select('id').single()
    if (error || !ins) return { ok: false, error: 'We could not save your review. Please try again.' }
    reviewId = ins.id as string
  }
  await admin.from('review_photos').delete().eq('review_id', reviewId)
  const photos = input.photoPaths.slice(0, REVIEW_PHOTOS_LIMIT)
  if (photos.length) await admin.from('review_photos').insert(photos.map(path => ({ review_id: reviewId, path })))
  await admin.from('review_windows').update(role === 'trade' ? { trade_review_submitted: true } : { client_review_submitted: true }).eq('id', w.id)

  if (!mine) await logJobEvent(admin, job.id, 'review_submitted', `${role === 'trade' ? 'Trade' : 'Client'} submitted their review`, userId)
  if (theirs) {
    await publishWindow(admin, job.id)
    revalidatePath(`/jobs/${job.id}`)
    revalidatePath(`/my/jobs/${job.id}`)
    return { ok: true, published: true }
  }
  if (!mine) await notify(admin, revieweeId, { type: 'review', title: 'They have written their review', body: 'Write yours before the window closes. Neither shows until both are in or the 14 days end.', link: role === 'trade' ? `/my/jobs/${job.id}#review` : `/jobs/${job.id}#review` })
  revalidatePath(`/jobs/${job.id}`)
  revalidatePath(`/my/jobs/${job.id}`)
  return { ok: true, published: false }
}
