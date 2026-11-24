'use client'

import { depositPence, quoteTotals } from '@/lib/quotes/calc'
import { formatPence, percentOf } from '@/lib/money'
import { Card, Input } from '@/components/ui'
import { MoneyInput } from './money-input'
import type { SectionProps } from './builder-types'

export function PaymentSection({ q, set, vatRegistered }: SectionProps & { vatRegistered: boolean }) {
  const total = quoteTotals(q.lines, vatRegistered && q.vatApplies).totalPence
  const dep = depositPence(q.deposit, total)
  const remaining = total - dep
  const staged = q.stages.reduce((s, x) => s + x.amountPence, 0)
  const left = remaining - staged
  const updateStage = (i: number, patch: Partial<(typeof q.stages)[number]>) => set({ stages: q.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) })

  return (
    <Card>
      <h2 className="text-base font-bold text-brand-navy">When you get paid</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(['on_completion', 'in_stages'] as const).map(t => (
          <button key={t} type="button" onClick={() => set({ timing: t, stages: t === 'in_stages' && q.stages.length === 0 ? [{ name: 'Stage 1', amountPence: 0 }] : q.stages })}
            className={`min-h-[48px] rounded-xl border-2 text-sm font-semibold ${q.timing === t ? 'border-brand-amber bg-amber-50' : 'border-gray-200 text-gray-600'}`}>
            {t === 'on_completion' ? 'On completion' : 'In stages'}
          </button>
        ))}
      </div>
      {q.timing === 'on_completion' ? (
        <p className="mt-3 text-sm text-gray-600">The balance{dep ? ' after the deposit' : ''}, {formatPence(Math.max(0, remaining))}, is one final stage.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {q.stages.map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-3">
              <Input aria-label={`Stage ${i + 1} name`} value={s.name} onChange={e => updateStage(i, { name: e.target.value })} placeholder="First fix" />
              <div className="mt-2 flex items-center gap-2">
                <MoneyInput label={`Stage ${i + 1} amount`} valuePence={s.amountPence} onChange={p => updateStage(i, { amountPence: p })} className="flex-1" />
                <div className="w-20 shrink-0"><Input aria-label={`Stage ${i + 1} percentage`} inputMode="decimal" placeholder="%" className="text-center"
                  value={remaining > 0 && s.amountPence ? String(Math.round((s.amountPence / total) * 1000) / 10) : ''}
                  onChange={e => updateStage(i, { amountPence: percentOf(total, Number(e.target.value.replace(/[^\d.]/g, '')) || 0) })} /></div>
                <button type="button" onClick={() => set({ stages: q.stages.filter((_, j) => j !== i) })} className="min-h-[48px] px-2 text-sm text-red-600" aria-label={`Remove stage ${i + 1}`}>✕</button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => set({ stages: [...q.stages, { name: `Stage ${q.stages.length + 1}`, amountPence: Math.max(0, left) }] })} className="min-h-[48px] rounded-xl border-2 border-dashed border-gray-300 px-4 text-sm font-semibold text-brand-navy">+ Add a stage</button>
            {left !== 0 && q.stages.length > 0 && (
              <button type="button" onClick={() => updateStage(q.stages.length - 1, { amountPence: q.stages[q.stages.length - 1].amountPence + left })} className="min-h-[48px] rounded-xl px-4 text-sm font-semibold text-brand-navy underline">
                Put the rest in the last stage
              </button>
            )}
          </div>
          <p className={`text-sm ${left === 0 ? 'text-green-700' : 'text-amber-700'}`}>
            {left === 0 ? 'Deposit and stages add up to the total.' : left > 0 ? `${formatPence(left)} still to put in a stage.` : `Stages are ${formatPence(-left)} over the total.`}
          </p>
        </div>
      )}
    </Card>
  )
}
