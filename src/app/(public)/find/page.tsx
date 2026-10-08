import { Avatar } from '@/components/avatar'
import { formatAreas } from '@/lib/format-areas'
import type { Metadata } from 'next'
import { FindForm } from './find-form'
import { searchTradespeople } from '@/actions/search-tradespeople'
import type { TradesearchResult, SeededSearchResult } from '@/actions/search-tradespeople'
import { createClient } from '@/lib/supabase/server'
import { DEMO_TRADE_PROFILES } from '@/lib/demo-data'
import { DemoProfileCard } from '@/components/demo/demo-profile-card'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Find a Tradesperson | WorkedWith',
  description: 'Search verified tradespeople near you. Every tradesperson on WorkedWith has confirmed jobs and genuine mutual reviews.',
}

type PageProps = {
  searchParams: Promise<{ trade?: string; postcode?: string }>
}

export default async function FindPage({ searchParams }: PageProps) {
  const { trade, postcode } = await searchParams

  const hasSearch = Boolean(trade && postcode)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  let searchResult: Awaited<ReturnType<typeof searchTradespeople>> | null = null
  if (hasSearch) {
    searchResult = await searchTradespeople(trade!, postcode!)
  }

  const district = searchResult?.success ? searchResult.district : undefined

  const realResults = searchResult?.success ? searchResult.results : []
  const seededResults = searchResult?.success ? searchResult.seededResults : []
  const hasRealResults = realResults.length > 0
  const hasSeededResults = seededResults.length > 0
  const hasAnyResults = hasRealResults || hasSeededResults

  // Demo profiles only when there are no real and no seeded matches
  const showDemo = hasSearch && searchResult?.success && !hasAnyResults

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* ── Navy header with embedded search ─────────────────── */}
      <header className="bg-brand-navy px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-white sm:text-5xl">
            Find a tradesperson
          </h1>
          <p className="mt-3 text-base text-white/70">
            Verified tradespeople with genuine mutual reviews from real jobs.
          </p>

          {/* Search card */}
          <div className="mt-6 rounded-2xl bg-white/10 backdrop-blur-sm p-5 shadow-xl ring-1 ring-white/20">
            <FindForm
              defaultTrade={trade}
              defaultPostcode={postcode}
            />
          </div>
        </div>
      </header>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">

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

        {/* Demo profiles — only when no real and no seeded results */}
        {showDemo && (
          <div>
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-amber-800 font-medium text-sm">
                No verified tradespeople in {district ?? 'your area'} yet. WorkedWith is growing fast.
                Here is what a WorkedWith profile looks like.
              </p>
              {!isAuthenticated && (
                <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <a
                    href="/join/client"
                    className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Create a free client account
                  </a>
                  <a
                    href="/for-trades"
                    className="text-sm font-semibold text-brand-navy underline"
                  >
                    Know a tradesperson? Tell them about WorkedWith
                  </a>
                </div>
              )}
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {DEMO_TRADE_PROFILES.map(profile => (
                <DemoProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          </div>
        )}

        {/* Results (authenticated) */}
        {hasSearch && searchResult?.success && hasAnyResults && isAuthenticated && (
          <div>
            <p className="text-sm text-gray-400 mb-4">
              {realResults.length} verified result{realResults.length !== 1 ? 's' : ''}
              {hasSeededResults ? ` + ${seededResults.length} unverified listing${seededResults.length !== 1 ? 's' : ''}` : ''}
              {' '}covering {district}
            </p>
            <div className="space-y-4">
              {realResults.map(result => (
                <ResultCard key={result.id} result={result} />
              ))}
              {hasSeededResults && realResults.length > 0 && (
                <div className="relative my-2 flex items-center gap-3">
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                  <span className="text-xs text-gray-400 shrink-0">Not yet on WorkedWith</span>
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                </div>
              )}
              {seededResults.map(result => (
                <SeededResultCard key={result.id} result={result} />
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">
              Pro members who have boosted this district appear first. All other matches appear below in no particular order.
            </p>
          </div>
        )}

        {/* Auth gate — results found but user not signed in */}
        {hasSearch && searchResult?.success && hasAnyResults && !isAuthenticated && (
          <div className="rounded-2xl border border-brand-amber/30 bg-amber-50 p-10 text-center">
            <p className="text-3xl mb-4" aria-hidden>🔍</p>
            <p className="text-lg font-bold text-brand-navy">
              {realResults.length} tradesperson{realResults.length !== 1 ? 's' : ''} covering {district}
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

// ── Real result card ──────────────────────────────────────────

function ResultCard({ result }: { result: TradesearchResult }) {
  const hasReviews = result.total_reviews > 0

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <Avatar name={result.company_name || result.full_name} photoUrl={result.photo_url} sizeClass="h-12 w-12" textClass="text-base" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-brand-navy leading-snug">{result.company_name || result.full_name}</h2>
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
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {result.trade_types.map(t => (
          <span key={t} className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 flex-wrap">
        {hasReviews ? (
          <div className="flex items-center gap-1.5">
            <div className="flex text-base">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={s <= Math.round(result.average_rating) ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>
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
        {formatAreas(result.operating_areas) && (
          <span className="text-sm text-gray-400">📍 {formatAreas(result.operating_areas)}</span>
        )}
      </div>

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

// ── Seeded result card ────────────────────────────────────────

function SeededResultCard({ result }: { result: SeededSearchResult }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-700 leading-snug">{result.business_name}</h2>
          <span className="mt-1.5 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            Not yet on WorkedWith
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
          {result.trade_category}
        </span>
      </div>

      <div className="mt-5 flex justify-end">
        <a
          href={`/t/${result.public_slug}`}
          className="inline-flex min-h-[44px] items-center rounded-xl border-2 border-gray-300 px-5 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
        >
          View listing
        </a>
      </div>
    </div>
  )
}
