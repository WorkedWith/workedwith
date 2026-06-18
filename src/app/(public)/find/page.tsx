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

        {/* Empty results */}
        {hasSearch && searchResult?.success && searchResult.results.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 p-16 text-center">
            <p className="text-5xl" aria-hidden>🔍</p>
            <p className="mt-4 text-xl font-semibold text-gray-400">No results found</p>
            <p className="mt-2 text-sm text-gray-400">
              Try a wider radius or different trade type.
            </p>
          </div>
        )}

        {/* Results list */}
        {hasSearch && searchResult?.success && searchResult.results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
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
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Top row: name + distance badge */}
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
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
          {result.distance.toFixed(1)} miles
        </span>
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
