'use client'

import { Card, Input } from '@/components/ui'
import type { SectionProps } from './builder-types'

export function StartSection({ q, set }: SectionProps) {
  const opts = [
    { v: 'to_be_agreed', l: 'To be agreed' },
    { v: 'asap', l: 'As soon as possible' },
    { v: 'date', l: 'A date' },
  ] as const
  return (
    <Card>
      <h2 className="text-base font-bold text-brand-navy">Planned start</h2>
      <p className="text-xs text-gray-500">Always shown as planned, never guaranteed.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {opts.map(o => (
          <button key={o.v} type="button" onClick={() => set({ plannedStart: { type: o.v, date: o.v === 'date' ? q.plannedStart.date : null } })}
            className={`min-h-[48px] rounded-xl border-2 px-1 text-sm font-semibold ${q.plannedStart.type === o.v ? 'border-brand-amber bg-amber-50' : 'border-gray-200 text-gray-600'}`}>
            {o.l}
          </button>
        ))}
      </div>
      {q.plannedStart.type === 'date' && (
        <Input type="date" className="mt-3" aria-label="Planned start date" value={q.plannedStart.date ?? ''} min={new Date().toISOString().slice(0, 10)}
          onChange={e => set({ plannedStart: { type: 'date', date: e.target.value || null } })} />
      )}
    </Card>
  )
}
