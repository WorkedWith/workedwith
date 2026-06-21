import type { DemoTradeProfile, DemoClientReview } from '@/lib/demo-data'

type Props = {
  profile: DemoTradeProfile
  reviews: DemoClientReview[]
}

export function DemoProfilePage({ profile, reviews }: Props) {
  return (
    <>
      {/* Example profile banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-amber-800 leading-snug">
            <span className="font-semibold">This is an example WorkedWith profile.</span>{' '}
            Join to see real verified tradespeople in your area.
          </p>
          <a
            href="/join/client/individual"
            className="shrink-0 rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
          >
            Join free
          </a>
        </div>
      </div>

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-brand-navy px-4 pb-8 pt-10 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <p className="mb-6 text-sm font-bold tracking-tight text-white/60">
              Worked<span className="text-brand-amber">With</span>
            </p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{profile.full_name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.trade_types.map(t => (
                <span key={t} className="rounded-full bg-brand-amber/20 px-3 py-1 text-sm font-medium text-brand-amber">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
              <span>📍 {profile.postcode}</span>
              <span>{profile.years_experience} years experience</span>
              <span>Member since 2024</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-5">

          {/* WorkedWith Score */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              WorkedWith Score
            </h2>
            <div className="flex items-start gap-6">
              <div>
                <p className="text-5xl font-bold leading-none text-brand-navy">
                  {profile.average_rating.toFixed(1)}
                </p>
                <div className="mt-1.5">
                  <Stars rating={profile.average_rating} size="lg" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-brand-navy">{profile.total_reviews}</span>{' '}
                  verified review{profile.total_reviews !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-brand-navy">{profile.total_jobs}</span>{' '}
                  confirmed job{profile.total_jobs !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </section>

          {/* Verification badges */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Verified on WorkedWith
            </h2>
            <div className="flex flex-wrap gap-2">
              <VerifiedBadge>✓ Phone Verified</VerifiedBadge>
              {profile.verification_tier === 'fully_verified' && (
                <VerifiedBadge>✓ ID Verified</VerifiedBadge>
              )}
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                ✓ WorkedWith Member Since 2024
              </span>
            </div>
          </section>

          {/* Bio */}
          {profile.bio && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">About</h2>
              <p className="text-sm leading-relaxed text-gray-700">{profile.bio}</p>
            </section>
          )}

          {/* Reviews */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
              Reviews ({reviews.length})
            </h2>
            <div className="space-y-4">
              {reviews.map((review, i) => (
                <ReviewCard key={i} review={review} />
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border border-brand-amber/30 bg-amber-50 p-6 text-center">
            <p className="font-semibold text-brand-navy">
              Want to find real tradespeople like this?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Every profile on WorkedWith is built from real confirmed jobs.
            </p>
            <a
              href="/find"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Find tradespeople in your area
            </a>
          </section>

        </div>
      </main>
    </>
  )
}

function ReviewCard({ review }: { review: DemoClientReview }) {
  const rating = review.overall_rating

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <Stars rating={rating} size="base" />
        <time className="shrink-0 text-sm text-gray-400">{review.date}</time>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {review.reviewer_label}
        </span>
        {review.is_backdated && (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            Verified past job
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-700">{review.written_review}</p>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
        <SubScoreRow label="Quality" score={review.quality_score} />
        <SubScoreRow label="Communication" score={review.communication_score} />
        <SubScoreRow label="Reliability" score={review.reliability_score} />
        <SubScoreRow label="Value" score={review.value_score} />
      </div>
    </article>
  )
}

function Stars({ rating, size }: { rating: number; size: 'base' | 'lg' }) {
  const filled = Math.round(rating)
  const cls = size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <div className={`flex ${cls}`} aria-label={`${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>★</span>
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
            <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>★</span>
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
