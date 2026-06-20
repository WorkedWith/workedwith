'use client'

import { useState } from 'react'
import type { JobHistoryItem } from '@/actions/get-job-history'
import { JobDetailModal } from './job-detail-modal'

interface Props {
  jobs: JobHistoryItem[]
}

function formatDate(started_at: string | null, backdated_period: string | null, is_backdated: boolean): string {
  if (is_backdated && backdated_period) return backdated_period
  if (started_at) {
    return new Date(started_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  return 'Date unknown'
}

function StatusBadge({ status, otherPartyName }: { status: string; otherPartyName: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    pending_confirmation: {
      label: `Waiting for ${otherPartyName} to confirm`,
      className: 'bg-gray-100 text-gray-600',
    },
    active:    { label: 'In progress', className: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed',   className: 'bg-green-100 text-green-700' },
    disputed:  { label: 'Disputed',    className: 'bg-red-100 text-red-700' },
  }
  const { label, className } = variants[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null
  const full = Math.round(rating)
  return (
    <span className="text-brand-amber text-sm" aria-label={`${rating} out of 5`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

export function JobHistory({ jobs }: Props) {
  const [selectedJob, setSelectedJob] = useState<JobHistoryItem | null>(null)

  if (jobs.length === 0) {
    return (
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Your jobs</p>
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-500">No jobs yet. Add a past job to get started.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Your jobs</p>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {jobs.length}
        </span>
      </div>

      <div className="space-y-3">
        {jobs.map(job => {
          const now = Date.now()
          const windowOpen = job.review_window
            ? (job.review_window.window_closes_at === null || new Date(job.review_window.window_closes_at).getTime() > now)
            : false
          const myReviewSubmitted = job.review_window
            ? (job.my_role === 'trade'
                ? job.review_window.trade_review_submitted
                : job.review_window.client_review_submitted)
            : false
          const reviewPending = windowOpen && !myReviewSubmitted

          return (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-brand-amber hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-navy truncate">{job.other_party.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {job.job_type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(job.started_at, job.backdated_period, job.is_backdated)}
                    </span>
                  </div>
                  {job.status === 'pending_confirmation' && (() => {
                    const initiatedByViewer =
                      (job.my_role === 'trade' && job.initiated_by === 'trade') ||
                      (job.my_role === 'client' && job.initiated_by === 'client')
                    const text = initiatedByViewer
                      ? `You sent this invite — waiting for ${job.other_party.name} to confirm`
                      : job.my_role === 'client'
                        ? 'Logged by the tradesperson — confirm this job happened'
                        : `Logged by ${job.other_party.name} — confirm this job happened`
                    return <p className="mt-1.5 text-xs text-gray-400">{text}</p>
                  })()}
                </div>
                <StatusBadge status={job.status} otherPartyName={job.other_party.name} />
              </div>

              {(job.reviews.received || job.reviews.given || reviewPending) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-50 pt-3">
                  {job.reviews.received && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">They rated you</span>
                      <StarRating rating={job.reviews.received.overall_rating} />
                    </div>
                  )}
                  {job.reviews.given && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">You rated them</span>
                      <StarRating rating={job.reviews.given.overall_rating} />
                    </div>
                  )}
                  {reviewPending && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Review pending
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </section>
  )
}
