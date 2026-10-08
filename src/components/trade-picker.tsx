'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TRADE_TYPES, SPECIALISMS } from '@/lib/trade-types'

type Props = {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
}

type Row = { label: string; parent: string | null }

/** Alphabetical list of main trades, each followed by its specialisms. "Other" is always last. */
function buildRows(): Row[] {
  const rows: Row[] = []
  for (const t of TRADE_TYPES) {
    if (t === 'Other') continue
    rows.push({ label: t, parent: null })
    for (const sp of SPECIALISMS[t] ?? []) rows.push({ label: sp, parent: t })
  }
  return rows
}

const ALL_ROWS = buildRows()

export function TradePicker({ value, onChange, id, placeholder = 'Choose a trade' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    searchRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const rows = useMemo(() => {
    if (!q) return ALL_ROWS
    return ALL_ROWS.filter(r => r.label.toLowerCase().includes(q) || (r.parent ?? '').toLowerCase().includes(q))
  }, [q])
  const showOther = !q || 'other'.includes(q)

  function pick(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  let lastLetter = ''

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex h-12 w-full min-w-0 items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-left text-base text-brand-navy focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber sm:text-sm"
      >
        <span className={value ? '' : 'text-gray-400'}>{value || placeholder}</span>
        <span aria-hidden className="text-gray-400">▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose a trade"
          className="fixed inset-0 z-50 flex flex-col bg-white sm:items-center sm:justify-center sm:bg-black/40 sm:p-6"
        >
          <div className="flex min-h-0 flex-1 flex-col bg-white sm:max-h-[80vh] sm:w-full sm:max-w-md sm:flex-none sm:rounded-2xl sm:shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-bold text-brand-navy">Choose a trade</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[44px] px-2 text-sm font-semibold text-gray-500"
              >
                Close
              </button>
            </div>
            <div className="border-b border-gray-100 p-3">
              <label htmlFor="trade-search" className="sr-only">Search trades</label>
              <input
                id="trade-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search, for example LVT"
                autoComplete="off"
                className="h-12 w-full rounded-lg border border-gray-200 px-3 text-base text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
              />
              {!q && <p className="mt-2 text-xs text-gray-400">Listed A to Z. Specialisms sit under their trade.</p>}
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto pb-6">
              {rows.length === 0 && !showOther && (
                <li className="px-4 py-6 text-sm text-gray-500">No trades match. Try another word.</li>
              )}
              {rows.map(r => {
                const letter = r.parent ? '' : r.label[0].toUpperCase()
                const showLetter = !q && letter && letter !== lastLetter
                if (letter) lastLetter = letter
                return (
                  <li key={r.label}>
                    {showLetter && (
                      <div className="sticky top-0 bg-gray-50 px-4 py-1 text-xs font-bold text-gray-400">{letter}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => pick(r.label)}
                      className={`flex min-h-[48px] w-full items-center justify-between px-4 text-left text-base hover:bg-amber-50 ${
                        r.parent && !q ? 'pl-8 text-sm text-gray-600' : 'font-medium text-brand-navy'
                      }`}
                    >
                      <span>
                        {r.label}
                        {r.parent && q && <span className="ml-2 text-xs font-normal text-gray-400">in {r.parent}</span>}
                      </span>
                      {value === r.label && <span aria-hidden className="text-brand-amber">✓</span>}
                    </button>
                  </li>
                )
              })}
              {showOther && (
                <li>
                  {!q && <div className="sticky top-0 bg-gray-50 px-4 py-1 text-xs font-bold text-gray-400">Other</div>}
                  <button
                    type="button"
                    onClick={() => pick('Other')}
                    className="flex min-h-[48px] w-full items-center px-4 text-left text-base font-medium text-brand-navy hover:bg-amber-50"
                  >
                    Other
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
