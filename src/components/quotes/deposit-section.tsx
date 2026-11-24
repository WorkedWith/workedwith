'use client'

import { depositPence, quoteTotals } from '@/lib/quotes/calc'
import { formatPence } from '@/lib/money'
import { depositWording, PERSON_NON_REFUNDABLE_NOTE } from '@/lib/quotes/wording'
import { Card, Input, Label, Notice, Select } from '@/components/ui'
import { MoneyInput } from './money-input'
import type { SectionProps } from './builder-types'
import type { DepositFor, NonRefundableFrom } from '@/types/v42'

export function DepositSection({ q, set, vatRegistered }: SectionProps & { vatRegistered: boolean }) {
  const d = q.deposit
  const setD = (patch: Partial<typeof d>) => set({ deposit: { ...d, ...patch } })
  const total = quoteTotals(q.lines, vatRegistered && q.vatApplies).totalPence
  const amount = depositPence(d, total)

  return (
    <Card>
      <label className="flex min-h-[48px] items-center gap-3">
        <input type="checkbox" className="h-5 w-5" checked={d.required} onChange={e => setD({ required: e.target.checked })} />
        <span className="text-base font-bold text-brand-navy">Take a deposit to book this job in</span>
      </label>
      {!d.required && <p className="text-sm text-gray-500">The job is booked as soon as the client accepts.</p>}
      {d.required && (
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['amount', 'percent'] as const).map(m => (
              <button key={m} type="button" onClick={() => setD({ mode: m })} className={`min-h-[44px] rounded-xl border-2 text-sm font-semibold ${d.mode === m ? 'border-brand-amber bg-amber-50' : 'border-gray-200 text-gray-600'}`}>
                {m === 'amount' ? 'A sum' : 'A percentage'}
              </button>
            ))}
          </div>
          {d.mode === 'amount' ? (
            <div><Label htmlFor="damt">Amount</Label><MoneyInput id="damt" valuePence={d.amountPence} onChange={p => setD({ amountPence: p })} /></div>
          ) : (
            <div>
              <Label htmlFor="dpct" hint={`That is ${formatPence(amount)}.`}>Percentage of the total</Label>
              <Input id="dpct" inputMode="decimal" value={d.percent || ''} onChange={e => setD({ percent: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} />
            </div>
          )}
          <div>
            <Label htmlFor="dfor">What it covers</Label>
            <Select id="dfor" value={d.for} onChange={e => {
              const f = e.target.value as DepositFor
              setD({ for: f, nonRefundableFrom: d.refundable ? d.nonRefundableFrom : f === 'labour' ? 'work_started' : 'materials_ordered' })
            }}>
              <option value="materials">Materials</option>
              <option value="labour">Labour</option>
              <option value="materials_and_labour">Materials and labour</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="dref">Refundable or non refundable</Label>
            <Select id="dref" value={d.refundable ? 'yes' : 'no'} onChange={e => {
              const refundable = e.target.value === 'yes'
              setD({ refundable, nonRefundableFrom: refundable ? null : d.for === 'labour' ? 'work_started' : 'materials_ordered' })
            }}>
              <option value="yes">Refundable</option>
              <option value="no">Non refundable from a set point</option>
            </Select>
          </div>
          {!d.refundable && (
            <div>
              <Label htmlFor="dnr">It becomes non refundable</Label>
              <Select id="dnr" value={d.nonRefundableFrom ?? 'materials_ordered'} onChange={e => setD({ nonRefundableFrom: e.target.value as NonRefundableFrom })}>
                <option value="materials_ordered">Once materials are ordered</option>
                <option value="work_started">Once work starts</option>
                {q.client.kind === 'company' && <option value="payment">From payment (company clients only)</option>}
              </Select>
            </div>
          )}
          {!d.refundable && q.client.kind === 'person' && <Notice tone="blue">{PERSON_NON_REFUNDABLE_NOTE}</Notice>}
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            The client sees: {depositWording({ amountPence: amount, for: d.for, refundable: d.refundable, nonRefundableFrom: d.nonRefundableFrom, clientKind: q.client.kind })}
          </p>
        </div>
      )}
    </Card>
  )
}
