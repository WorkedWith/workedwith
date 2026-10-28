'use client'

import { useState, useTransition } from 'react'
import { findTradeByName, type PickedTrade } from '@/actions/find-trade-by-name'

/** First step of "Add a job": find a trade who is already on WorkedWith, so nothing is typed twice. */
export function PickTrade() {
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [district, setDistrict] = useState('')
  const [results, setResults] = useState<PickedTrade[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function search(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const r = await findTradeByName({ query, district })
      if (r.success) setResults(r.trades)
      else { setResults(null); setError(r.error) }
    })
  }

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <h2 className="text-xl font-semibold text-brand-navy">Are they already on WorkedWith?</h2>
      <p className="mt-1 text-sm text-gray-500">
        Search by business name. If you find them, we send the request straight to their account.
      </p>
      <form onSubmit={search} className="mt-4 space-y-3" noValidate>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={isPending}
          placeholder="Business name"
          aria-label="Business name"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent disabled:opacity-50"
        />
        <input
          type="text"
          value={district}
          onChange={e => setDistrict(e.target.value.toUpperCase().slice(0, 4))}
          disabled={isPending}
          placeholder="Area, for example M20 (optional)"
          aria-label="Postcode area"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending || query.trim().length < 3}
          className="w-full rounded-lg bg-brand-navy px-4 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {results && results.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
          {results.map(t => (
            <li key={t.slug}>
              <a href={`/t/${t.slug}/job`} className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-brand-navy">{t.name}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {[t.trades.join(', '), t.areas.length > 0 ? `Covers ${t.areas.join(', ')}` : ''].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-brand-navy">Choose →</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {results && results.length === 0 && (
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          We could not find them. Fill in their details below and we will invite them.
        </p>
      )}
    </div>
  )
}
