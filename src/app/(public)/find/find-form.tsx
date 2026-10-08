'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { TradePicker } from '@/components/trade-picker'

type Props = {
  defaultTrade?: string
  defaultPostcode?: string
}

export function FindForm({ defaultTrade = '', defaultPostcode = '' }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [trade, setTrade] = useState(defaultTrade)
  const [pickerError, setPickerError] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!trade) {
      setPickerError(true)
      return
    }
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams({
      trade,
      postcode: (fd.get('postcode') as string).trim().toUpperCase(),
    })
    startTransition(() => {
      router.push(`/find?${params.toString()}`)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1.5fr_auto] sm:items-center"
    >
      <div>
        <label htmlFor="trade" className="sr-only">Trade type</label>
        <TradePicker
          id="trade"
          value={trade}
          onChange={v => { setTrade(v); setPickerError(false) }}
          placeholder="Choose a trade"
        />
        {pickerError && <p className="mt-1 text-xs text-red-300">Please choose a trade.</p>}
      </div>

      <label htmlFor="postcode" className="sr-only">Your postcode</label>
      <input
        id="postcode"
        name="postcode"
        type="text"
        required
        defaultValue={defaultPostcode}
        placeholder="Your postcode"
        autoComplete="postal-code"
        className="h-12 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-base text-brand-navy placeholder-gray-400 sm:text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber uppercase"
      />

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-lg bg-brand-amber px-6 text-sm font-bold text-brand-navy whitespace-nowrap hover:bg-amber-400 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
