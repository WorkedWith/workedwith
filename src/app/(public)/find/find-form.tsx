'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { TRADE_TYPES } from '@/lib/trade-types'

const RADII = [5, 10, 25, 50] as const

type Props = {
  defaultTrade?: string
  defaultPostcode?: string
  defaultRadius?: string
}

export function FindForm({ defaultTrade = '', defaultPostcode = '', defaultRadius = '10' }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams({
      trade: fd.get('trade') as string,
      postcode: (fd.get('postcode') as string).trim().toUpperCase(),
      radius: fd.get('radius') as string,
    })
    startTransition(() => {
      router.push(`/find?${params.toString()}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label htmlFor="trade" className="sr-only">Trade type</label>
      <select
        id="trade"
        name="trade"
        required
        defaultValue={defaultTrade}
        className="min-h-[48px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
      >
        <option value="" disabled>Select a trade type</option>
        {TRADE_TYPES.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <label htmlFor="postcode" className="sr-only">Your postcode</label>
      <input
        id="postcode"
        name="postcode"
        type="text"
        required
        defaultValue={defaultPostcode}
        placeholder="Postcode"
        autoComplete="postal-code"
        className="min-h-[48px] sm:w-36 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber uppercase"
      />

      <label htmlFor="radius" className="sr-only">Search radius</label>
      <select
        id="radius"
        name="radius"
        defaultValue={defaultRadius}
        className="min-h-[48px] sm:w-32 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
      >
        {RADII.map(r => (
          <option key={r} value={r}>{r} miles</option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-[48px] rounded-xl bg-brand-amber px-8 text-sm font-bold text-brand-navy hover:bg-amber-400 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
