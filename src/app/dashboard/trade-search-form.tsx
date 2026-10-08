'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { TradePicker } from '@/components/trade-picker'

/** Dashboard search box for clients. Same picker as the find page, so specialisms are searchable. */
export function TradeSearchForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [trade, setTrade] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!trade) { setError(true); return }
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams({
      trade,
      postcode: String(fd.get('postcode') ?? '').trim().toUpperCase(),
    })
    startTransition(() => router.push(`/find?${params.toString()}`))
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1.5fr_auto] sm:items-start">
        <div>
          <label htmlFor="dash-trade" className="sr-only">Trade type</label>
          <TradePicker
            id="dash-trade"
            value={trade}
            onChange={v => { setTrade(v); setError(false) }}
            placeholder="Choose a trade"
          />
          {error && <p className="mt-1 text-xs text-red-600">Please choose a trade.</p>}
        </div>
        <input
          name="postcode"
          type="text"
          required
          placeholder="Your postcode"
          autoComplete="postal-code"
          className="h-12 w-full rounded-lg border border-gray-200 px-3 text-base uppercase text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber sm:text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-12 w-full whitespace-nowrap rounded-lg bg-brand-amber px-4 text-sm font-bold text-brand-navy transition-colors hover:bg-amber-400 disabled:opacity-60"
        >
          {isPending ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  )
}
