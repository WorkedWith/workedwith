import { createAdminClient } from '@/lib/supabase/admin'
import type { Review, User, Job, FeaturedJobImage, FeaturedJob, TradeProfile } from '@/types/database'
import { ImageModerationButtons } from './image-moderation-buttons'

export const metadata = { title: 'Flags — WorkedWith Admin' }

const reasonLabels: Record<string, string> = {
  aggressive_behaviour: 'Aggressive behaviour',
  refused_access: 'Refused access',
  non_payment: 'Non-payment',
  false_dispute: 'False dispute',
  unsafe_site: 'Unsafe site',
  other: 'Other',
}

type FlaggedReview = Pick<Review, 'id' | 'red_flag_reason' | 'written_review' | 'created_at' | 'reviewee_id' | 'job_id'>
type PendingImage = Pick<FeaturedJobImage, 'id' | 'storage_path' | 'caption' | 'created_at' | 'featured_job_id'>
type FeaturedJobRow = Pick<FeaturedJob, 'id' | 'title' | 'trade_profile_id'>
type TradeProfileRow = Pick<TradeProfile, 'id' | 'user_id' | 'company_name'>

export default async function FlagsPage() {
  const admin = createAdminClient()

  const [
    { data: rawReviews },
    { data: rawPendingImages },
  ] = await Promise.all([
    admin
      .from('reviews')
      .select('id, red_flag_reason, written_review, created_at, reviewee_id, job_id')
      .eq('red_flag', true)
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('featured_job_images')
      .select('id, storage_path, caption, created_at, featured_job_id')
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100),
  ])

  const flaggedReviews = (rawReviews ?? []) as unknown as FlaggedReview[]
  const pendingImages = (rawPendingImages ?? []) as unknown as PendingImage[]

  // Resolve featured job and tradesperson data for pending images
  let featuredJobsMap = new Map<string, FeaturedJobRow>()
  let tradeProfilesMap = new Map<string, TradeProfileRow>()
  const tradeUsersMap = new Map<string, string>() // profileId → full_name

  if (pendingImages.length > 0) {
    const featuredJobIds = Array.from(new Set(pendingImages.map(i => i.featured_job_id)))
    const { data: rawFeaturedJobs } = await admin
      .from('featured_jobs')
      .select('id, title, trade_profile_id')
      .in('id', featuredJobIds)

    const fJobs = (rawFeaturedJobs ?? []) as unknown as FeaturedJobRow[]
    featuredJobsMap = new Map(fJobs.map(j => [j.id, j]))

    const tradeProfileIds = Array.from(new Set(fJobs.map(j => j.trade_profile_id)))
    const { data: rawTPs } = await admin
      .from('trade_profiles')
      .select('id, user_id, company_name')
      .in('id', tradeProfileIds)

    const tps = (rawTPs ?? []) as unknown as TradeProfileRow[]
    tradeProfilesMap = new Map(tps.map(p => [p.id, p]))

    const userIds = Array.from(new Set(tps.map(p => p.user_id)))
    const { data: rawUsers } = await admin
      .from('users')
      .select('id, full_name')
      .in('id', userIds)

    for (const u of (rawUsers ?? []) as Pick<User, 'id' | 'full_name'>[]) {
      tradeUsersMap.set(u.id, u.full_name)
    }
  }

  // Resolve reviewees and jobs for flagged reviews
  const revieweeIds = flaggedReviews.length > 0
    ? Array.from(new Set(flaggedReviews.map(r => r.reviewee_id)))
    : []
  const jobIds = flaggedReviews.length > 0
    ? Array.from(new Set(flaggedReviews.map(r => r.job_id)))
    : []

  const [{ data: rawUsers }, { data: rawJobs }] = await Promise.all([
    revieweeIds.length > 0
      ? admin.from('users').select('id, full_name').in('id', revieweeIds)
      : Promise.resolve({ data: [] }),
    jobIds.length > 0
      ? admin.from('jobs').select('id, completed_at, job_type').in('id', jobIds)
      : Promise.resolve({ data: [] }),
  ])

  const users = (rawUsers ?? []) as Pick<User, 'id' | 'full_name'>[]
  const jobs = (rawJobs ?? []) as unknown as Pick<Job, 'id' | 'completed_at' | 'job_type'>[]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  return (
    <div className="max-w-3xl space-y-10">

      {/* ── Pending featured job images ─────────────────────── */}
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Pending image moderation</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pendingImages.length} image{pendingImages.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>

        {pendingImages.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">No pending images — you&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            {pendingImages.map(img => {
              const featuredJob = featuredJobsMap.get(img.featured_job_id)
              const tradeProfile = featuredJob
                ? tradeProfilesMap.get(featuredJob.trade_profile_id)
                : undefined
              const tradeName = tradeProfile
                ? (tradeProfile.company_name ?? tradeUsersMap.get(tradeProfile.user_id) ?? '—')
                : '—'

              return (
                <div key={img.id} className="flex items-start gap-4 px-5 py-4">
                  {/* Image preview */}
                  <div className="shrink-0 h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/featured-job-images/${img.storage_path}`}
                      alt={img.caption ?? 'Featured job image'}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{tradeName}</p>
                    {featuredJob && (
                      <p className="text-xs text-gray-500 mt-0.5">{featuredJob.title}</p>
                    )}
                    {img.caption && (
                      <p className="text-xs text-gray-600 mt-1 italic">&ldquo;{img.caption}&rdquo;</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(img.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                    <div className="mt-3">
                      <ImageModerationButtons imageId={img.id} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Red-flagged reviews ─────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Flagged reviews</h2>
          <p className="mt-1 text-sm text-gray-500">
            {flaggedReviews.length} red-flagged review{flaggedReviews.length === 1 ? '' : 's'} — read-only.
          </p>
        </div>

        {flaggedReviews.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">No flagged reviews.</p>
          </div>
        ) : (
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
                          Reviewer of{' '}
                          <span className="font-medium text-gray-600">{reviewee?.full_name ?? '—'}</span>
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
        )}
      </section>

    </div>
  )
}
