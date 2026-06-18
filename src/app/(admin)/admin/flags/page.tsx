import { createAdminClient } from '@/lib/supabase/admin'
import type { Review, User, Job } from '@/types/database'

export const metadata = { title: 'Flagged Reviews — WorkedWith Admin' }

const reasonLabels: Record<string, string> = {
  aggressive_behaviour: 'Aggressive behaviour',
  refused_access: 'Refused access',
  non_payment: 'Non-payment',
  false_dispute: 'False dispute',
  unsafe_site: 'Unsafe site',
  other: 'Other',
}

type FlaggedReview = Pick<Review, 'id' | 'red_flag_reason' | 'written_review' | 'created_at' | 'reviewee_id' | 'job_id'>

export default async function FlagsPage() {
  const admin = createAdminClient()

  const { data: rawReviews } = await admin
    .from('reviews')
    .select('id, red_flag_reason, written_review, created_at, reviewee_id, job_id')
    .eq('red_flag', true)
    .order('created_at', { ascending: false })
    .limit(200)

  const flaggedReviews = (rawReviews ?? []) as unknown as FlaggedReview[]

  if (flaggedReviews.length === 0) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Flagged Reviews</h1>
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-500">No flagged reviews</p>
        </div>
      </div>
    )
  }

  // Fetch reviewees and jobs
  const revieweeIds = Array.from(new Set(flaggedReviews.map(r => r.reviewee_id)))
  const jobIds = Array.from(new Set(flaggedReviews.map(r => r.job_id)))

  const [{ data: rawUsers }, { data: rawJobs }] = await Promise.all([
    admin.from('users').select('id, full_name').in('id', revieweeIds),
    admin.from('jobs').select('id, completed_at, job_type').in('id', jobIds),
  ])

  const users = (rawUsers ?? []) as Pick<User, 'id' | 'full_name'>[]
  const jobs = (rawJobs ?? []) as unknown as Pick<Job, 'id' | 'completed_at' | 'job_type'>[]

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Flagged Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">
          {flaggedReviews.length} red-flagged review{flaggedReviews.length === 1 ? '' : 's'} — read-only in v1.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
        {flaggedReviews.map(review => {
          const reviewee = users.find(u => u.id === review.reviewee_id)
          const job = jobs.find(j => j.id === review.job_id)
          return (
            <div key={review.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
                      {reasonLabels[review.red_flag_reason ?? ''] ?? 'Unknown reason'}
                    </span>
                    <span className="text-xs text-gray-400">
                      Reviewer of <span className="font-medium text-gray-600">{reviewee?.full_name ?? '—'}</span>
                    </span>
                  </div>
                  {review.written_review && (
                    <p className="mt-2 text-sm text-gray-700 line-clamp-3">
                      &ldquo;{review.written_review}&rdquo;
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {job?.job_type && (
                    <p className="text-xs font-medium text-gray-600">{job.job_type}</p>
                  )}
                  {job?.completed_at && (
                    <p className="text-xs text-gray-400">
                      {new Date(job.completed_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-300">
                    {new Date(review.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
