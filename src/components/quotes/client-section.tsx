'use client'

import { Card, Input, Label, TextArea } from '@/components/ui'
import type { SectionProps } from './builder-types'

export function ClientSection({ q, set }: SectionProps) {
  const c = q.client
  const setC = (patch: Partial<typeof c>) => set({ client: { ...c, ...patch } })
  return (
    <Card>
      <h2 className="text-base font-bold text-brand-navy">Client</h2>
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Client type">
        {(['person', 'company'] as const).map(k => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={c.kind === k}
            onClick={() => setC({ kind: k })}
            className={`min-h-[48px] rounded-xl border-2 text-sm font-semibold ${c.kind === k ? 'border-brand-amber bg-amber-50 text-brand-navy' : 'border-gray-200 text-gray-600'}`}
          >
            {k === 'person' ? 'A person' : 'A company'}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        {c.kind === 'person' ? 'Anyone in their own name, including sole traders. The safe default.' : 'A limited company or other business, like a landlord’s company.'}
      </p>
      <div className="mt-4 space-y-3">
        {c.kind === 'company' && (
          <div><Label htmlFor="cco">Company name</Label><Input id="cco" value={c.companyName} onChange={e => setC({ companyName: e.target.value })} /></div>
        )}
        <div><Label htmlFor="cname">{c.kind === 'company' ? 'Contact name' : 'Name'}</Label><Input id="cname" autoComplete="off" value={c.name} onChange={e => setC({ name: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="cmob">Mobile</Label><Input id="cmob" type="tel" inputMode="tel" value={c.mobile} onChange={e => setC({ mobile: e.target.value })} placeholder="07700 900123" /></div>
          <div><Label htmlFor="cemail">Email</Label><Input id="cemail" type="email" inputMode="email" value={c.email} onChange={e => setC({ email: e.target.value })} /></div>
        </div>
        <div><Label htmlFor="caddr">Job address</Label><TextArea id="caddr" rows={2} value={c.jobAddress} onChange={e => setC({ jobAddress: e.target.value })} /></div>
      </div>
    </Card>
  )
}
