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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="trade" className="block text-sm font-medium text-gray-700 mb-1.5">
            Trade type
          </label>
          <select
            id="trade"
            name="trade"
            required
            defaultValue={defaultTrade}
            className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          >
            <option value="" disabled>Select a trade</option>
            {TRADE_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1.5">
            Your postcode
          </label>
          <input
            id="postcode"
            name="postcode"
            type="text"
            required
            defaultValue={defaultPostcode}
            placeholder="e.g. SW1A 1AA"
            autoComplete="postal-code"
            className="w-full min-h-[44px] rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber uppercase"
          />
        </div>

        <div>
          <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1.5">
            Within
          </label>
          <select
            id="radius"
            name="radius"
            defaultValue={defaultRadius}
            className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          >
            {RADII.map(r => (
              <option key={r} value={r}>{r} miles</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto min-h-[48px] rounded-xl bg-brand-navy px-8 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
