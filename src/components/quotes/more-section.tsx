'use client'

import { useState } from 'react'
import { Card, Label, Select, TextArea } from '@/components/ui'
import type { SectionProps } from './builder-types'

export function MoreSection({ q, set }: SectionProps) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex min-h-[44px] w-full items-center justify-between text-left">
        <span className="text-base font-bold text-brand-navy">More options</span>
        <span className="text-sm text-gray-500">{open ? 'Hide' : `Valid ${q.validDays} days, follow ups ${q.followUps ? 'on' : 'off'}`}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          <div>
            <Label htmlFor="valid">Quote valid for</Label>
            <Select id="valid" value={q.validDays} onChange={e => set({ validDays: Number(e.target.value) })}>
              {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
            </Select>
          </div>
          <label className="flex min-h-[48px] items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={q.followUps} onChange={e => set({ followUps: e.target.checked })} />
            <span>Send automatic follow ups: a nudge at day 3 and 7 if viewed but not accepted, a reminder at day 3 if never opened, and one 3 days before it expires.</span>
          </label>
          <div>
            <Label htmlFor="xterms" hint="WorkedWith standard terms, and the cancellation notice for person clients, are always attached.">Extra terms for this quote</Label>
            <TextArea id="xterms" rows={3} value={q.extraTerms} onChange={e => set({ extraTerms: e.target.value })} />
          </div>
        </div>
      )}
    </Card>
  )
}
