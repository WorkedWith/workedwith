'use client'

import { useEffect } from 'react'
import type { JobHistoryItem } from '@/actions/get-job-history'

interface Props {
  job: JobHistoryItem
  onClose: () => void
}

function formatDate(started_at: string | null, backdated_period: string | null, is_backdated: boolean): string {
  if (is_backdated && backdated_period) return backdated_period
  if (started_at) {
    return new Date(started_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  return 'Date unknown'
}

function StarRow({ label, rating }: { label: string; rating: number | null }) {
  if (!rating) return null
  const full = Math.round(rating)
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-brand-amber text-sm" aria-label={`${rating} out of 5`}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: 'Awaiting confirmation',
  active: 'In progress',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
}

export function JobDetailModal({ job, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const now = Date.now()
  const windowOpen = job.review_window
    ? (job.review_window.window_closes_at === null || new Date(job.review_window.window_closes_at).getTime() > now)
    : false
  const myReviewSubmitted = job.review_window
    ? (job.my_role === 'trade' ? job.review_window.trade_review_submitted : job.review_window.client_review_submitted)
    : false
  const canLeaveReview = windowOpen && !myReviewSubmitted

  return (
    <>
      <style>{`@keyframes wwFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="absolute inset-0 bg-black/50"
          style={{ animation: 'wwFadeIn 0.15s ease' }}
        />
        <div
          className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto"
          style={{ animation: 'wwFadeIn 0.2s ease' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-brand-navy">
                {job.job_type} with {job.other_party.name}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {formatDate(job.started_at, job.backdated_period, job.is_backdated)}
                {job.postcode ? ` · ${job.postcode}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Status</span>
              <span className="text-sm font-medium text-gray-700">
                {STATUS_LABELS[job.status] ?? job.status}
              </span>
            </div>

            {/* Pending confirmation */}
            {job.status === 'pending_confirmation' && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-sm text-gray-600">
                  This job is waiting for the other party to confirm.
                </p>
              </div>
            )}

            {/* Trade profile link — shown to clients viewing a trade */}
            {job.my_role === 'client' && job.other_party.public_slug && (
              <a
                href={`/t/${job.other_party.public_slug}`}
                className="block text-sm font-medium text-brand-amber hover:underline"
              >
                View {job.other_party.name}&apos;s WorkedWith profile →
              </a>
            )}

            {/* Reviews */}
            {(job.reviews.received || job.reviews.given) && (
              <div className="space-y-4">
                {job.reviews.received && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Their review of you
                    </p>
                    <StarRow label="Overall" rating={job.reviews.received.overall_rating} />
                    {job.my_role === 'trade' && (
                      <>
                        <StarRow label="Quality" rating={job.reviews.received.quality_score} />
                        <StarRow label="Reliability" rating={job.reviews.received.reliability_score} />
                        <StarRow label="Value" rating={job.reviews.received.value_score} />
                        <StarRow label="Communication" rating={job.reviews.received.communication_score} />
                      </>
                    )}
                    {job.my_role === 'client' && (
                      <>
                        <StarRow label="Payment" rating={job.reviews.received.payment_score} />
                        <StarRow label="Scope clarity" rating={job.reviews.received.scope_clarity_score} />
                        <StarRow label="Site access" rating={job.reviews.received.site_access_score} />
                      </>
                    )}
                    {job.reviews.received.written_review && (
                      <p className="mt-3 text-sm text-gray-700 border-t border-gray-200 pt-3 italic">
                        &ldquo;{job.reviews.received.written_review}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {job.reviews.given && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Your review of them
                    </p>
                    <StarRow label="Overall" rating={job.reviews.given.overall_rating} />
                    {job.reviews.given.written_review && (
                      <p className="mt-3 text-sm text-gray-700 border-t border-gray-200 pt-3 italic">
                        &ldquo;{job.reviews.given.written_review}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Review pending CTA */}
            {canLeaveReview && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-medium text-amber-800">
                  You have not left your review yet
                </p>
                <a
                  href={`/jobs/${job.id}/review`}
                  className="mt-3 inline-block rounded-lg bg-brand-amber px-4 py-2 text-sm font-bold text-brand-navy hover:bg-amber-400 transition-colors"
                >
                  Leave your review
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
