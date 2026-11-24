import { formatPenceExact, formatPence } from '@/lib/money'
import { depositWording, plannedStartWording } from '@/lib/quotes/wording'
import type { ClientKind, DepositFor, NonRefundableFrom, PlannedStartType } from '@/types/v42'

export type QuoteView = {
  businessName: string
  title: string
  description: string | null
  clientName: string
  clientCompany: string | null
  jobAddress: string | null
  lines: { description: string; pricePence: number }[]
  vatApplies: boolean
  netPence: number
  vatPence: number
  totalPence: number
  deposit: { required: boolean; amountPence: number; for: DepositFor | null; refundable: boolean; nonRefundableFrom: NonRefundableFrom | null }
  stages: { name: string; amountPence: number }[]
  plannedStart: { type: PlannedStartType; date: string | null }
  validUntil: string | null
  clientKind: ClientKind
  version?: number
  photos?: { url: string }[]
}

/** What the client sees. Price and what they are agreeing to first (PRD 5, designed for the phone). */
export function QuoteDocument({ q }: { q: QuoteView }) {
  return (
    <article className="space-y-4">
      <header className="rounded-2xl bg-brand-navy p-5 text-white">
        <p className="text-sm text-white/70">{q.businessName}{q.version && q.version > 1 ? ` · version ${q.version}` : ''}</p>
        <h2 className="mt-1 text-xl font-bold">{q.title}</h2>
        <p className="mt-3 text-3xl font-bold tabular-nums">{formatPenceExact(q.totalPence)}</p>
        {q.vatApplies && <p className="text-sm text-white/70">{formatPenceExact(q.netPence)} plus VAT of {formatPenceExact(q.vatPence)}</p>}
        <p className="mt-2 text-sm text-white/80">{plannedStartWording(q.plannedStart.type, q.plannedStart.date)}</p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">How you pay</h3>
        <ul className="mt-2 divide-y divide-gray-100">
          {q.deposit.required && q.deposit.amountPence > 0 && (
            <li className="py-2.5">
              <div className="flex justify-between gap-3 text-sm"><span className="font-medium">Deposit, due when you accept</span><span className="tabular-nums">{formatPence(q.deposit.amountPence)}</span></div>
              <p className="mt-1 text-xs text-gray-600">{depositWording({ amountPence: q.deposit.amountPence, for: q.deposit.for, refundable: q.deposit.refundable, nonRefundableFrom: q.deposit.nonRefundableFrom, clientKind: q.clientKind })}</p>
            </li>
          )}
          {q.stages.map((s, i) => (
            <li key={i} className="flex justify-between gap-3 py-2.5 text-sm"><span>{s.name}</span><span className="tabular-nums">{formatPence(s.amountPence)}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-500">You only pay a stage once you have approved it. Pay by bank transfer straight to {q.businessName}.</p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">What is included</h3>
        {q.description && <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{q.description}</p>}
        <ul className="mt-2 divide-y divide-gray-100">
          {q.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-2.5 text-sm"><span className="min-w-0 break-words">{l.description}</span><span className="shrink-0 tabular-nums">{formatPenceExact(l.pricePence)}</span></li>
          ))}
        </ul>
        <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-sm">
          {q.vatApplies && <div className="flex justify-between"><span className="text-gray-500">Total without VAT</span><span className="tabular-nums">{formatPenceExact(q.netPence)}</span></div>}
          {q.vatApplies && <div className="flex justify-between"><span className="text-gray-500">VAT at 20%</span><span className="tabular-nums">{formatPenceExact(q.vatPence)}</span></div>}
          <div className="flex justify-between font-bold"><span>Total</span><span className="tabular-nums">{formatPenceExact(q.totalPence)}</span></div>
        </div>
        {q.photos && q.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {q.photos.map((p, i) => <img key={i} src={p.url} alt="Photo from the trade" className="aspect-square w-full rounded-lg object-cover" />)}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
        <p><span className="text-gray-500">For:</span> {q.clientCompany ? `${q.clientCompany} (${q.clientName})` : q.clientName}</p>
        {q.jobAddress && <p className="mt-1"><span className="text-gray-500">Address:</span> {q.jobAddress}</p>}
        {q.validUntil && <p className="mt-1"><span className="text-gray-500">Valid until:</span> {new Date(q.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
      </section>
    </article>
  )
}
