'use client'

import { useEffect, useState } from 'react'
import { parsePounds } from '@/lib/money'

/** Pounds and pence entry with a numeric keypad on phones. Holds pence. */
export function MoneyInput({ valuePence, onChange, id, label, className = '' }: {
  valuePence: number
  onChange: (pence: number) => void
  id?: string
  label?: string
  className?: string
}) {
  const [text, setText] = useState(valuePence ? (valuePence / 100).toFixed(2).replace(/\.00$/, '') : '')
  useEffect(() => {
    const parsed = parsePounds(text)
    if ((parsed ?? 0) !== valuePence) setText(valuePence ? (valuePence / 100).toFixed(2).replace(/\.00$/, '') : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuePence])
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-gray-500">£</span>
      <input
        id={id}
        aria-label={label}
        inputMode="decimal"
        value={text}
        placeholder="0"
        onChange={e => {
          setText(e.target.value)
          const p = parsePounds(e.target.value)
          onChange(p ?? 0)
        }}
        className="block min-h-[48px] w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 text-right text-base tabular-nums focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
      />
    </div>
  )
}
