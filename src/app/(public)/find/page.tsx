import type { Metadata } from 'next'
import { FindForm } from './find-form'
import { searchTradespeople } from '@/actions/search-tradespeople'
import type { TradesearchResult } from '@/actions/search-tradespeople'
import { createClient } from '@/lib/supabase/server'
import { DEMO_TRADE_PROFILES } from '@/lib/demo-data'
import { DemoProfileCard } from '@/components/demo/demo-profile-card'

export const metadata: Metadata = {
  title: 'Find a Tradesperson — WorkedWith',
  description: 'Search verified tradespeople near you. Every tradesperson on WorkedWith has confirmed jobs and genuine mutual reviews.',
}

type PageProps = {
  searchParams: Promise<{ trade?: string; postcode?: string; radius?: string }>
}

export default async function FindPage({ searchParams }: PageProps) {
  const { trade, postcode, radius } = await searchParams

  const hasSearch = Boolean(trade && postcode)
  const radiusNum = Math.max(5, Math.min(50, parseInt(radius ?? '10', 10) || 10))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  let searchResult: Awaited<ReturnType<typeof searchTradespeople>> | null = null
  if (hasSearch) {
    searchResult = await searchTradespeople(trade!, postcode!, radiusNum)
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navy header with embedded search ─────────────────── */}
      <header className="bg-brand-navy px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <a href="/" className="text-lg font-bold tracking-tight text-white/70 hover:text-white transition-colors">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
            Find a tradesperson
          </h1>
          <p className="mt-3 text-base text-white/70">
            Verified tradespeople with genuine mutual reviews from real jobs.
          </p>

          {/* Search card */}
          <div className="mt-8 rounded-2xl bg-white/10 backdrop-blur-sm p-5 shadow-xl ring-1 ring-white/20">
            <FindForm
              defaultTrade={trade}
              defaultPostcode={postcode}
              defaultRadius={radius}
            />
          </div>
        </div>
      </header>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">

        {/* No search yet */}
        {!hasSearch && (
          <div className="rounded-xl border border-dashed border-gray-200 p-16 text-center">
            <p className="text-5xl" aria-hidden>🔍</p>
            <p className="mt-4 text-xl font-semibold text-gray-400">Find a tradesperson near you</p>
            <p className="mt-2 text-sm text-gray-400">
              Enter a trade type and postcode above to get started.
            </p>
          </div>
        )}

        {/* Error state */}
        {hasSearch && searchResult && !searchResult.success && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5">
            <p className="text-sm font-medium text-red-700">{searchResult.error}</p>
          </div>
        )}

        {/* Empty results — show demo profiles */}
        {hasSearch && searchResult?.success && searchResult.results.length === 0 && (
          <div>
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-amber-800 font-medium text-sm">
                No verified tradespeople in your area yet — WorkedWith is growing fast.
                Here is what a WorkedWith profile looks like.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {DEMO_TRADE_PROFILES.map(profile => (
                <DemoProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          </div>
        )}

        {/* Results list (authenticated) */}
        {hasSearch && searchResult?.success && searchResult.results.length > 0 && isAuthenticated && (
          <div>
            <p className="text-sm text-gray-400 mb-4">
              {searchResult.results.length} result{searchResult.results.length !== 1 ? 's' : ''} near {postcode?.toUpperCase()}
            </p>
            <div className="space-y-4">
              {searchResult.results.map(result => (
                <ResultCard key={result.id} result={result} />
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">
              Pro members appear at the top of results. Standard and Free members appear below.
            </p>
          </div>
        )}

        {/* Auth gate — results found but user not signed in */}
        {hasSearch && searchResult?.success && searchResult.results.length > 0 && !isAuthenticated && (
          <div className="rounded-2xl border border-brand-amber/30 bg-amber-50 p-10 text-center">
            <p className="text-3xl mb-4" aria-hidden>🔍</p>
            <p className="text-lg font-bold text-brand-navy">
              {searchResult.results.length} tradesperson{searchResult.results.length !== 1 ? 's' : ''} found near {postcode?.toUpperCase()}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Create a free account to view tradespeople, their reviews, and contact details.
            </p>
            <a
              href="/join/client/individual"
              className="mt-6 inline-flex min-h-[48px] items-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Join free as a client
            </a>
            <p className="mt-4 text-xs text-gray-400">
              Already have an account?{' '}
              <a href="/sign-in" className="text-brand-amber hover:underline font-medium">Sign in</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Result card ───────────────────────────────────────────────

function ResultCard({ result }: { result: TradesearchResult }) {
  const hasReviews = result.total_reviews > 0

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Top row: name + tier badge + distance badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-brand-navy leading-snug">{result.full_name}</h2>
          {result.verification_tier === 'fully_verified' && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              ID Verified
            </span>
          )}
          {result.verification_tier === 'phone_verified' && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Phone Verified
            </span>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {result.subscription_tier === 'pro' && (
            <span className="rounded-full bg-brand-amber px-2.5 py-0.5 text-xs font-bold text-brand-navy">
              Pro
            </span>
          )}
          {result.subscription_tier === 'standard' && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              Verified
            </span>
          )}
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
            {result.distance.toFixed(1)} miles
          </span>
        </div>
      </div>

      {/* Trade type pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {result.trade_types.map(t => (
          <span
            key={t}
            className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Stars + location */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        {hasReviews ? (
          <div className="flex items-center gap-1.5">
            <div className="flex text-base">
              {[1, 2, 3, 4, 5].map(s => (
                <span
                  key={s}
                  className={s <= Math.round(result.average_rating) ? 'text-brand-amber' : 'text-gray-200'}
                  aria-hidden
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm font-semibold text-brand-navy">{result.average_rating.toFixed(1)}</span>
            <span className="text-sm text-gray-400">
              ({result.total_reviews} review{result.total_reviews !== 1 ? 's' : ''})
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">No reviews yet</span>
        )}
        <span className="text-sm text-gray-400">📍 {result.postcode}</span>
      </div>

      {/* View profile */}
      <div className="mt-5 flex justify-end">
        <a
          href={`/t/${result.public_slug}`}
          className="inline-flex min-h-[44px] items-center rounded-xl border-2 border-brand-navy px-5 text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
        >
          View profile
        </a>
      </div>
    </div>
  )
}
