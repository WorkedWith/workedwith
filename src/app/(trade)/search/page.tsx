import { APP_URL } from '@/lib/app-url'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientProfileByIdentifier } from '@/actions/get-client-profile-by-username'
import { DAILY_LOOKUP_LIMIT } from '@/lib/lookup'
import type { ClientProfileResult } from '@/actions/get-client-profile'
import type { VerificationTier } from '@/types/database'

export const metadata = { title: 'Client lookup | WorkedWith' }

type PageProps = {
  searchParams: { username?: string | string[] }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('phone_verified, user_type').eq('id', user.id).single()

  if (!userData || !userData.phone_verified) redirect('/verify/phone')
  if (userData.user_type !== 'trade' && userData.user_type !== 'both') redirect('/dashboard')

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('subscription_tier')
    .eq('user_id', user.id)
    .maybeSingle()

  const subscriptionTier = (tradeProfile?.subscription_tier as string | null | undefined) ?? 'free'

  const rawUsername = Array.isArray(searchParams.username)
    ? searchParams.username[0]
    : searchParams.username
  const username = rawUsername?.trim() || null

  let result: ClientProfileResult | null = null
  if (username) {
    result = await getClientProfileByIdentifier(username)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Client lookup</h1>
          <p className="mt-1 text-sm text-gray-500">
            {subscriptionTier === 'free'
              ? 'Find a client by their WorkedWith username, email address or mobile number to see their overall rating and member since date. Upgrade to Standard for full scores and written reviews.'
              : 'Find a client by their WorkedWith username, email address or mobile number to view their full reputation profile.'}
          </p>
        </div>

        {/* Search form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form method="GET" action="/search" className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Client username, email or mobile
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                defaultValue={username ?? ''}
                placeholder="Username, email address or mobile number"
                autoComplete="off"
                className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-brand-amber px-4 text-sm font-bold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Privacy notice */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
          <p className="text-xs text-gray-500">
            <strong className="font-medium text-gray-700">Privacy notice:</strong>{' '}
            Searches are logged and audited. Results are only returned for users who have a WorkedWith client profile.
            Searches are limited to {DAILY_LOOKUP_LIMIT} per day.
          </p>
        </div>

        {/* Result */}
        {result && <SearchResult result={result} />}
      </div>
    </main>
  )
}

// ── Result display ─────────────────────────────────────────────

function SearchResult({ result }: { result: ClientProfileResult }) {
  if (result.status === 'rate_limited') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-semibold text-amber-900">Daily search limit reached</p>
        <p className="mt-1 text-sm text-amber-700">
          You have used all {DAILY_LOOKUP_LIMIT} client lookups for today. This limit protects client privacy.{' '}
          {result.resets_at
            ? `You can search again from ${new Date(result.resets_at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.`
            : 'Try again tomorrow.'}
        </p>
      </div>
    )
  }

  if (result.status === 'not_found') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700">No client found</p>
        <p className="mt-1 text-sm text-gray-500">
          They may not have a WorkedWith client account yet, or those details may be different.
        </p>
        <a
          href={`mailto:?subject=Join me on WorkedWith&body=Hi, I use WorkedWith to verify my jobs and reviews. You can create a free client account at ${APP_URL}/join/client It only takes a minute.`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 transition-colors"
        >
          Invite them to join
        </a>
      </div>
    )
  }

  if (result.status === 'unauthorized' || result.status === 'unverified') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">Access error. Please refresh the page and try again.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Navy header */}
      <div className="bg-brand-navy px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {result.client_name && (
              <h3 className="mb-2 truncate text-xl font-bold text-white">{result.client_name}</h3>
            )}
            <StarDisplay rating={result.overall_rating} total={result.total_reviews} />
            {result.total_reviews > 0 && (
              <p className="mt-1 text-sm text-white/60">
                {`${result.total_reviews} review${result.total_reviews !== 1 ? 's' : ''} confirmed by both sides`}
              </p>
            )}
          </div>
          <VerificationBadge tier={result.verification_tier} />
        </div>
        <p className="mt-3 text-xs text-white/40">
          Member since {fmtMemberSince(result.member_since)}
        </p>
      </div>

      {/* Free tier — upgrade prompt */}
      {result.status === 'free' && (
        <div className="px-6 py-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-900">Upgrade to Standard to see more</p>
            <p className="mt-1 text-xs text-amber-700 leading-relaxed">
              Upgrade to Standard to see payment reliability, red flag history, and written review excerpts from other tradespeople.
            </p>
            <a
              href="/subscription"
              className="mt-3 inline-flex rounded-lg bg-brand-amber px-4 py-2 text-xs font-bold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Upgrade to Standard
            </a>
          </div>
        </div>
      )}

      {/* Standard / Pro — full profile */}
      {result.status === 'pro' && (
        <div className="divide-y divide-gray-100">
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Scores</h3>
            <div className="divide-y divide-gray-100">
              <ScoreRow label="Payment reliability" score={result.payment_reliability_score} total={result.total_reviews} />
              <ScoreRow label="Communication"       score={result.communication_score}       total={result.total_reviews} />
              <ScoreRow label="Scope clarity"       score={result.scope_clarity_score}       total={result.total_reviews} />
            </div>
          </div>

          {result.red_flag_count > 0 ? (
            <div className="px-6 py-4">
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${result.red_flag_count >= 3 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                <span className={`text-xl leading-none ${result.red_flag_count >= 3 ? 'text-red-500' : 'text-amber-500'}`} aria-hidden>⚑</span>
                <div>
                  <p className={`text-sm font-semibold ${result.red_flag_count >= 3 ? 'text-red-800' : 'text-amber-800'}`}>
                    {result.red_flag_count} red flag{result.red_flag_count !== 1 ? 's' : ''}
                  </p>
                  <p className={`text-xs ${result.red_flag_count >= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                    Raised by verified tradespeople on WorkedWith
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 text-green-700">
                <span className="text-sm" aria-hidden>✓</span>
                <p className="text-sm font-medium">No red flags</p>
              </div>
            </div>
          )}

          <ReviewsList reviews={result.recent_reviews} />
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function StarDisplay({ rating, total }: { rating: number; total: number }) {
  if (total === 0) {
    return <p className="text-lg font-semibold text-white/60">No reviews yet</p>
  }
  const filled = Math.round(rating)
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-white">{rating.toFixed(1)}</span>
      <div className="flex text-lg" aria-hidden>
        {[1, 2, 3, 4, 5].map(s => (
          <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-white/20'}>★</span>
        ))}
      </div>
    </div>
  )
}

function VerificationBadge({ tier }: { tier: VerificationTier }) {
  if (tier === 'fully_verified') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
        ✓ ID verified
      </span>
    )
  }
  if (tier === 'phone_verified') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
        ✓ Phone verified
      </span>
    )
  }
  return (
    <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      Unverified
    </span>
  )
}

function ScoreRow({ label, score, total }: { label: string; score: number; total: number }) {
  if (total === 0) {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm text-gray-400">—</span>
      </div>
    )
  }
  const filled = Math.round(score)
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5" aria-hidden>
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={`text-sm ${s <= filled ? 'text-brand-amber' : 'text-gray-200'}`}>●</span>
          ))}
        </div>
        <span className="w-7 text-right text-sm font-medium tabular-nums text-gray-900">
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

type RecentReview = {
  overall_rating: number | null
  written_review: string | null
  submitted_at: string
  reviewer_trade_type: string
}

function ReviewsList({ reviews }: { reviews: RecentReview[] }) {
  const withText = reviews.filter(r => r.written_review)
  if (withText.length === 0) return null

  return (
    <div className="px-6 py-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Written reviews</h3>
      <div className="divide-y divide-gray-100">
        {withText.map((review, i) => (
          <div key={i} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">{review.reviewer_trade_type}</span>
              <span className="text-xs text-gray-400">
                {new Date(review.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {review.overall_rating !== null && (
              <div className="flex mb-1.5" aria-hidden>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={`text-sm ${s <= (review.overall_rating ?? 0) ? 'text-brand-amber' : 'text-gray-200'}`}>★</span>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-700 leading-relaxed">{review.written_review}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function fmtMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
