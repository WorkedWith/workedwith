'use client'

import { useState } from 'react'
import { formatPenceExact } from '@/lib/money'
import { quoteTotals } from '@/lib/quotes/calc'
import { Card, Input } from '@/components/ui'
import { MoneyInput } from './money-input'
import type { SavedItemOption, SectionProps } from './builder-types'

export function LinesSection({ q, set, savedItems, vatRegistered }: SectionProps & { savedItems: SavedItemOption[]; vatRegistered: boolean }) {
  const [picking, setPicking] = useState(false)
  const lines = q.lines
  const update = (i: number, patch: Partial<(typeof lines)[number]>) => set({ lines: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  const t = quoteTotals(lines, vatRegistered && q.vatApplies)

  return (
    <Card>
      <h2 className="text-base font-bold text-brand-navy">Price</h2>
      <ul className="mt-3 space-y-3">
        {lines.map((l, i) => (
          <li key={i} className="rounded-xl border border-gray-200 p-3">
            <Input aria-label={`Line ${i + 1} description`} value={l.description} onChange={e => update(i, { description: e.target.value })} placeholder="What it is for" />
            <div className="mt-2 flex items-center gap-2">
              <MoneyInput label={`Line ${i + 1} price`} valuePence={l.pricePence} onChange={p => update(i, { pricePence: p })} className="flex-1" />
              {lines.length > 1 && (
                <button type="button" onClick={() => set({ lines: lines.filter((_, j) => j !== i) })} className="min-h-[48px] rounded-xl px-3 text-sm text-red-600 hover:bg-red-50" aria-label={`Remove line ${i + 1}`}>
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => set({ lines: [...lines, { description: '', pricePence: 0 }] })} className="min-h-[48px] rounded-xl border-2 border-dashed border-gray-300 px-4 text-sm font-semibold text-brand-navy">
          + Add a line
        </button>
        {savedItems.length > 0 && (
          <button type="button" onClick={() => setPicking(p => !p)} className="min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm font-semibold text-brand-navy">
            + From saved items
          </button>
        )}
      </div>
      {picking && (
        <ul className="mt-3 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
          {savedItems.map(s => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  const empty = lines.length === 1 && !lines[0].description && !lines[0].pricePence
                  set({ lines: [...(empty ? [] : lines), { description: s.description, pricePence: s.pricePence }] })
                  setPicking(false)
                }}
                className="flex min-h-[48px] w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-gray-50"
              >
                <span>{s.description}</span><span className="tabular-nums text-gray-600">{formatPenceExact(s.pricePence)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {vatRegistered && (
        <label className="mt-4 flex min-h-[48px] items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={q.vatApplies} onChange={e => set({ vatApplies: e.target.checked })} />
          Add VAT at 20%
        </label>
      )}
      <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
        {vatRegistered && q.vatApplies && (
          <>
            <div className="flex justify-between text-gray-600"><span>Without VAT</span><span className="tabular-nums">{formatPenceExact(t.netPence)}</span></div>
            <div className="flex justify-between text-gray-600"><span>VAT</span><span className="tabular-nums">{formatPenceExact(t.vatPence)}</span></div>
          </>
        )}
        <div className="flex justify-between text-base font-bold text-brand-navy"><span>Total</span><span className="tabular-nums">{formatPenceExact(t.totalPence)}</span></div>
      </div>
    </Card>
  )
}
