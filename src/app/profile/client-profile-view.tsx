import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getJobHistory } from '@/actions/get-job-history'
import { Avatar } from '@/components/avatar'
import { JobHistory } from '@/components/job-history'
import type { ClientProfile, Review } from '@/types/database'

interface Props {
  userId: string
  fullName: string
  clientProfile: ClientProfile
  photoUrl?: string | null
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value)
  return (
    <span className="tracking-widest text-amber-500" aria-label={`${value} out of 5`}>
      {'★'.repeat(full)}
      <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - full))}</span>
    </span>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {title && (
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      )}
      {children}
    </section>
  )
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <strong className="text-brand-navy">{value > 0 ? `${value.toFixed(1)} / 5` : 'Not rated yet'}</strong>
    </div>
  )
}

export async function ClientProfileView({ userId, fullName, clientProfile, photoUrl }: Props) {
  const admin = createAdminClient()
  const jobs = await getJobHistory()

  const { data: rawReviews } = await admin
    .from('reviews')
    .select('*')
    .eq('reviewee_id', userId)
    .eq('reviewee_type', 'client')
    .eq('is_visible', true)
    .order('submitted_at', { ascending: false })
  const reviews = (rawReviews ?? []) as unknown as Review[]

  const reviewerIds = Array.from(new Set(reviews.map(r => r.reviewer_id)))
  const { data: rawTrades } = reviewerIds.length
    ? await admin.from('trade_profiles').select('user_id, company_name').in('user_id', reviewerIds)
    : { data: [] }
  const tradeNames = new Map(
    ((rawTrades ?? []) as unknown as { user_id: string; company_name: string | null }[]).map(t => [
      t.user_id,
      t.company_name ?? 'A tradesperson',
    ])
  )

  const displayName = clientProfile.display_name ?? fullName
  const hasReviews = reviews.length > 0 || clientProfile.total_reviews > 0
  const completed = jobs.filter(j => j.status === 'completed').length

  return (
    <div>
      <div className="bg-brand-navy pb-6 pt-6">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Avatar
              name={displayName}
              photoUrl={photoUrl}
              sizeClass="h-16 w-16 sm:h-20 sm:w-20"
              textClass="text-xl sm:text-2xl"
              ringClass="border-2 border-white/20"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-white sm:text-2xl">{displayName}</h1>
              <p className="mt-1 text-sm text-white/60">
                {clientProfile.username ? `@${clientProfile.username} · ` : ''}Client · {clientProfile.postcode}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/60">This is how trades see you when they look you up.</p>
            <Link
              href="/profile/edit"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400"
            >
              Edit profile
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5 sm:px-6">
        <Card title="Your reputation with trades">
          {hasReviews ? (
            <>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold leading-none text-brand-navy">
                    {clientProfile.average_rating.toFixed(1)}
                  </div>
                  <div className="mt-1 text-sm"><Stars value={clientProfile.average_rating} /></div>
                </div>
                <div className="text-sm leading-relaxed text-gray-600">
                  <div><strong className="text-brand-navy">{clientProfile.total_reviews}</strong> {clientProfile.total_reviews === 1 ? 'review' : 'reviews'} from trades</div>
                  <div><strong className="text-brand-navy">{completed}</strong> {completed === 1 ? 'job' : 'jobs'} completed</div>
                </div>
              </div>
              <div className="mt-4">
                <ScoreRow label="Pays on time" value={clientProfile.payment_reliability_score} />
                <ScoreRow label="Communication" value={clientProfile.communication_score} />
                <ScoreRow label="Clear about the work" value={clientProfile.scope_clarity_score} />
              </div>
            </>
          ) : (
            <div className="text-sm leading-relaxed text-gray-600">
              <p className="font-semibold text-brand-navy">No reviews yet.</p>
              <p className="mt-1">
                After a job, you and the tradesperson each review the other. Once both of you have
                submitted, both reviews go live together. Trades who look you up will see this
                reputation before they quote, so a good one gets you taken seriously.
              </p>
            </div>
          )}
          {clientProfile.red_flag_count > 0 && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {clientProfile.red_flag_count} {clientProfile.red_flag_count === 1 ? 'review has' : 'reviews have'} raised a red flag.
              If a review is wrong, you can dispute it below.
            </p>
          )}
        </Card>

        {jobs.length > 0 ? (
          <JobHistory jobs={jobs} />
        ) : (
          <Card title="Your jobs">
            <p className="text-sm text-gray-600">
              No jobs yet. When a tradesperson logs a job with you, or you add a past one, it appears here.
            </p>
          </Card>
        )}

        <Card title="Reviews from trades">
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-600">Nothing to show yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {reviews.map(r => (
                <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    {r.overall_rating ? <Stars value={r.overall_rating} /> : <span />}
                    <span className="text-xs text-gray-500">
                      {new Date(r.submitted_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {r.written_review && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">{r.written_review}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{tradeNames.get(r.reviewer_id) ?? 'A tradesperson'} · Confirmed by both sides</span>
                    <Link href={`/reviews/${r.id}/dispute`} className="font-semibold text-gray-500 underline">
                      Dispute
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
