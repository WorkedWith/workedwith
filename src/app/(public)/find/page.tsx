import type { Metadata } from 'next'
import { FindForm } from './find-form'
import { searchTradespeople } from '@/actions/search-tradespeople'
import type { TradesearchResult } from '@/actions/search-tradespeople'

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

  let searchResult: Awaited<ReturnType<typeof searchTradespeople>> | null = null
  if (hasSearch) {
    searchResult = await searchTradespeople(trade!, postcode!, radiusNum)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="bg-brand-navy px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <a href="/" className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Find a tradesperson
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Verified tradespeople with genuine mutual reviews from real jobs.
          </p>
        </div>
      </header>

      {/* ── Search form ──────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <FindForm
            defaultTrade={trade}
            defaultPostcode={postcode}
            defaultRadius={radius}
          />
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {!hasSearch && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Enter a trade type and postcode to find tradespeople near you.
            </p>
          </div>
        )}

        {hasSearch && searchResult && !searchResult.success && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5">
            <p className="text-sm font-medium text-red-700">{searchResult.error}</p>
          </div>
        )}

        {hasSearch && searchResult?.success && searchResult.results.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-700">
              No verified tradespeople found within {radiusNum} miles of {postcode?.toUpperCase()} for {trade}.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Try increasing your search radius.
            </p>
          </div>
        )}

        {hasSearch && searchResult?.success && searchResult.results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {searchResult.results.length} result{searchResult.results.length !== 1 ? 's' : ''} near {postcode?.toUpperCase()}
            </p>
            {searchResult.results.map(result => (
              <ResultCard key={result.id} result={result} />
            ))}
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Name + verified badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-brand-navy">{result.full_name}</h2>
            {result.verification_tier === 'fully_verified' && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                ID Verified
              </span>
            )}
            {(result.verification_tier === 'phone_verified' || result.verification_tier === 'fully_verified') && result.verification_tier !== 'fully_verified' && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Phone Verified
              </span>
            )}
          </div>

          {/* Trade type pills */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.trade_types.map(t => (
              <span
                key={t}
                className="rounded-full bg-brand-amber/15 px-2.5 py-0.5 text-xs font-medium text-amber-800"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Score row */}
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            {hasReviews ? (
              <div className="flex items-center gap-1.5">
                <div className="flex text-sm">
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
            <span className="text-sm text-gray-400">
              📍 {result.postcode} &middot; {result.distance.toFixed(1)} miles away
            </span>
          </div>
        </div>

        {/* View profile */}
        <a
          href={`/t/${result.public_slug}`}
          className="shrink-0 min-h-[44px] flex items-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-brand-navy hover:border-brand-amber hover:bg-amber-50 transition-colors"
        >
          View profile
        </a>
      </div>
    </div>
  )
}
