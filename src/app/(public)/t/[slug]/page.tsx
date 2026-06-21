import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import type { VerificationTier } from '@/types/database'
import { CopyUrlButton } from './copy-url-button'
import { getFeaturedJobs } from '@/actions/featured-jobs/get-featured-jobs'
import { FeaturedWorkSection } from '@/components/featured-work-section'

type Props = { params: { slug: string } }

// ── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!profile) return { title: 'Profile not found | WorkedWith' }

  const { data: user } = await admin
    .from('users')
    .select('full_name')
    .eq('id', profile.user_id)
    .single()

  const tradeTypes = profile.trade_types as string[]
  const displayName = (profile.company_name as string | null) ?? (user?.full_name as string | undefined) ?? 'Tradesperson'
  const tradesLabel = tradeTypes.length > 0 ? tradeTypes.join(', ') : 'Tradesperson'
  const reviewsText =
    (profile.total_reviews as number) > 0
      ? `${profile.total_reviews} verified reviews on WorkedWith.`
      : 'New to WorkedWith.'

  const title = `${displayName} — ${tradesLabel} | WorkedWith`
  const description = `${displayName} is a verified ${tradesLabel} based in ${profile.postcode}. ${reviewsText}`
  const canonical = `https://workedwith.co.uk/t/${slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'WorkedWith',
      type: 'profile',
    },
  }
}

// ── Page ──────────────────────────────────────────────────────

export default async function TradeProfilePage({ params }: Props) {
  const { slug } = params
  const admin = createAdminClient()

  // 1. Trade profile
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!tradeProfile) notFound()

  const tradeTypes = tradeProfile.trade_types as string[]
  const userId = tradeProfile.user_id as string

  const tradeProfileId = tradeProfile.id as string

  // 2. Parallel: user row + visible reviews + reviewer activity + featured jobs
  const [
    { data: tradeUser },
    { data: reviews },
    { data: reviewerActivity },
    featuredJobs,
  ] = await Promise.all([
    admin.from('users').select('*').eq('id', userId).single(),
    admin
      .from('reviews')
      .select('*')
      .eq('reviewee_id', userId)
      .eq('reviewee_type', 'trade')
      .eq('is_visible', true)
      .order('created_at', { ascending: false }),
    admin
      .from('reviews')
      .select('id')
      .eq('reviewer_id', userId)
      .eq('reviewer_type', 'trade')
      .eq('is_visible', true)
      .limit(1),
    getFeaturedJobs(tradeProfileId),
  ])

  if (!tradeUser) notFound()

  const verTier = tradeUser.verification_tier as VerificationTier
  const displayName = (tradeProfile.company_name as string | null) ?? tradeUser.full_name as string
  const reviewList = reviews ?? []
  const reviewsClients = (reviewerActivity?.length ?? 0) > 0
  const profileUrl = `https://workedwith.co.uk/t/${slug}`

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: tradeUser.full_name as string,
    jobTitle: tradeTypes.length > 0 ? tradeTypes.join(', ') : 'Tradesperson',
    address: {
      '@type': 'PostalAddress',
      addressLocality: tradeProfile.postcode as string,
      addressCountry: 'GB',
    },
    url: profileUrl,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-gray-50">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="bg-brand-navy px-4 pb-8 pt-10 sm:px-6">
          <div className="mx-auto max-w-2xl">
            {/* WorkedWith wordmark */}
            <p className="mb-6 text-sm font-bold tracking-tight text-white/60">
              Worked<span className="text-brand-amber">With</span>
            </p>

            <h1 className="text-3xl font-bold text-white sm:text-4xl">{displayName}</h1>

            {/* Trade type pills */}
            {tradeTypes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tradeTypes.map(t => (
                  <span
                    key={t}
                    className="rounded-full bg-brand-amber/20 px-3 py-1 text-sm font-medium text-brand-amber"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
              <span>📍 {tradeProfile.postcode as string}</span>
              {(tradeProfile.years_experience as number | null) !== null && (
                <span>{tradeProfile.years_experience as number} years experience</span>
              )}
              <span>Member since {memberSinceYear(tradeUser.created_at as string)}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-5">

          {/* ── WorkedWith Score ──────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              WorkedWith Score
            </h2>
            {(tradeProfile.total_reviews as number) === 0 ? (
              <p className="text-sm text-gray-500">
                No reviews yet — reviews appear here once both parties have submitted.
              </p>
            ) : (
              <div className="flex items-start gap-6">
                <div>
                  <p className="text-5xl font-bold leading-none text-brand-navy">
                    {(tradeProfile.average_rating as number).toFixed(1)}
                  </p>
                  <div className="mt-1.5">
                    <Stars rating={tradeProfile.average_rating as number} size="lg" />
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-brand-navy">
                      {tradeProfile.total_reviews as number}
                    </span>{' '}
                    verified review{(tradeProfile.total_reviews as number) !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-brand-navy">
                      {tradeProfile.total_jobs as number}
                    </span>{' '}
                    confirmed job{(tradeProfile.total_jobs as number) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ── Verification badges ───────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Verified on WorkedWith
            </h2>
            <div className="flex flex-wrap gap-2">
              {(verTier === 'phone_verified' || verTier === 'fully_verified') && (
                <VerifiedBadge>✓ Phone Verified</VerifiedBadge>
              )}
              {verTier === 'fully_verified' && (
                <VerifiedBadge>✓ ID Verified</VerifiedBadge>
              )}
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                ✓ WorkedWith Member Since {memberSinceYear(tradeUser.created_at as string)}
              </span>
            </div>
          </section>

          {/* ── Review history ────────────────────────────────── */}
          {reviewList.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
                Reviews ({reviewList.length})
              </h2>
              <div className="space-y-4">
                {reviewList.map(review => {
                  const rid = review.id as string
                  const rating = review.overall_rating as number | null
                  const written = review.written_review as string | null
                  const qualScore = review.quality_score as number | null
                  const commScore = review.communication_score as number | null
                  const relScore = review.reliability_score as number | null
                  const valScore = review.value_score as number | null
                  const wha = review.would_work_again as boolean | null
                  const submittedAt = review.submitted_at as string
                  const isBackdated = review.is_backdated as boolean
                  const disputeStatus = review.dispute_status as string | null | undefined

                  return (
                    <article
                      key={rid}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                    >
                      {/* Top row: stars + date */}
                      <div className="flex items-start justify-between gap-4">
                        {rating !== null ? (
                          <Stars rating={rating} size="base" />
                        ) : (
                          <span className="text-sm text-gray-400">No rating</span>
                        )}
                        <time
                          dateTime={submittedAt}
                          className="shrink-0 text-sm text-gray-400"
                        >
                          {fmtMonthYear(submittedAt)}
                        </time>
                      </div>

                      {/* Badges */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          Verified client
                        </span>
                        {isBackdated && (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            Verified past job
                          </span>
                        )}
                        {disputeStatus === 'open' && (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            Under dispute
                          </span>
                        )}
                      </div>

                      {/* Written review */}
                      {written && (
                        <p className="mt-3 text-sm leading-relaxed text-gray-700">{written}</p>
                      )}

                      {/* Sub-scores */}
                      {(qualScore !== null || commScore !== null || relScore !== null || valScore !== null) && (
                        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
                          {qualScore !== null && (
                            <SubScoreRow label="Quality" score={qualScore} />
                          )}
                          {commScore !== null && (
                            <SubScoreRow label="Communication" score={commScore} />
                          )}
                          {relScore !== null && (
                            <SubScoreRow label="Reliability" score={relScore} />
                          )}
                          {valScore !== null && (
                            <SubScoreRow label="Value" score={valScore} />
                          )}
                        </div>
                      )}

                      {/* Would hire again */}
                      {wha !== null && (
                        <p className="mt-3 text-sm text-gray-600">
                          Would hire again:{' '}
                          <span
                            className={
                              wha
                                ? 'font-semibold text-green-600'
                                : 'font-medium text-gray-500'
                            }
                          >
                            {wha ? 'Yes' : 'No'}
                          </span>
                        </p>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Featured work ────────────────────────────────── */}
          {featuredJobs.length > 0 && (
            <FeaturedWorkSection
              jobs={featuredJobs}
              supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
            />
          )}

          {/* ── Also reviews clients ──────────────────────────── */}
          {reviewsClients && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-semibold text-amber-900">
                This tradesperson reviews their clients too
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-700">
                Reviews go both ways on WorkedWith — keeping both sides accountable.
              </p>
            </section>
          )}

          {/* ── Share section ─────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-brand-navy">Share this profile</h2>
            <div className="flex items-center gap-3">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
                workedwith.co.uk/t/{slug}
              </code>
              <CopyUrlButton url={profileUrl} />
            </div>
          </section>

        </div>
      </main>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────

function Stars({ rating, size }: { rating: number; size: 'base' | 'lg' }) {
  const filled = Math.round(rating)
  const cls = size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <div className={`flex ${cls}`} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>
          ★
        </span>
      ))}
    </div>
  )
}

function SubScoreRow({ label, score }: { label: string; score: number }) {
  const filled = Math.round(score)
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        <div className="flex text-xs">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>
              ★
            </span>
          ))}
        </div>
        <span className="w-6 text-right text-xs font-medium tabular-nums text-gray-700">
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

function VerifiedBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
      {children}
    </span>
  )
}

// ── Formatters ────────────────────────────────────────────────

function fmtMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function memberSinceYear(iso: string): number {
  return new Date(iso).getFullYear()
}
