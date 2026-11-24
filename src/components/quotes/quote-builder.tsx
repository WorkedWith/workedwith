'use client'

import { useMemo, useState, useTransition } from 'react'
import { saveQuoteDraft, sendQuote } from '@/actions/quotes'
import { depositPence, plannedStages, quoteProblems, quoteTotals, type QuoteDraftInput } from '@/lib/quotes/calc'
import { formatPenceExact } from '@/lib/money'
import { Button, Card, ErrorText, Notice } from '@/components/ui'
import { ClientSection } from './client-section'
import { JobSection } from './job-section'
import { LinesSection } from './lines-section'
import { DepositSection } from './deposit-section'
import { PaymentSection } from './payment-section'
import { StartSection } from './start-section'
import { MoreSection } from './more-section'
import { PhotoPicker } from './photo-picker'
import { QuoteDocument } from './quote-document'
import type { PastQuoteOption, SavedItemOption } from './builder-types'

type Props = {
  initial: QuoteDraftInput
  businessName: string
  vatRegistered: boolean
  savedItems: SavedItemOption[]
  pastQuotes: PastQuoteOption[]
  isNewVersion: boolean
  blockers: string[]
  photoPreviews: Record<string, string>
}

/**
 * The quote builder (PRD 6). One column, works one handed on a phone. The default quote needs only the
 * client, the job and the price. A sticky bar keeps the total and the Send button in reach.
 */
export function QuoteBuilder({ initial, businessName, vatRegistered, savedItems, pastQuotes, isNewVersion, blockers, photoPreviews }: Props) {
  const [q, setQ] = useState<QuoteDraftInput>(initial)
  const [previews, setPreviews] = useState<Record<string, string>>(photoPreviews)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const set = (patch: Partial<QuoteDraftInput>) => {
    setNotice(null)
    setQ(prev => ({ ...prev, ...patch }))
  }

  const totals = quoteTotals(q.lines, vatRegistered && q.vatApplies)
  const problems = useMemo(() => quoteProblems(q), [q])
  const dep = depositPence(q.deposit, totals.totalPence)

  function save() {
    setError(null)
    start(async () => {
      const r = await saveQuoteDraft(q)
      if (r.ok && r.data) {
        setQ(prev => ({ ...prev, quoteId: r.data!.quoteId, jobId: r.data!.jobId }))
        setNotice('Draft saved.')
      } else if (!r.ok) setError(r.error)
    })
  }
  function send() {
    setError(null)
    if (problems.length) return setError(problems[0])
    start(async () => {
      const r = await sendQuote(q)
      if (r.ok && r.data) window.location.href = `/jobs/${r.data.jobId}?sent=1`
      else if (!r.ok) setError(r.error)
    })
  }

  return (
    <div className="space-y-4">
      {blockers.map(b => <Notice key={b} tone="amber">{b}</Notice>)}
      {isNewVersion && <Notice tone="blue">You are editing a quote the client already has. Sending makes a new version and they must accept again.</Notice>}

      {pastQuotes.length > 0 && !q.quoteId && !q.jobId && (
        <details className="rounded-2xl border border-gray-200 bg-white p-4">
          <summary className="min-h-[32px] cursor-pointer text-sm font-semibold text-brand-navy">Copy a previous quote</summary>
          <ul className="mt-2 divide-y divide-gray-100">
            {pastQuotes.map(p => (
              <li key={p.id}><a href={`/quotes/new?copy=${p.id}`} className="flex min-h-[48px] items-center justify-between gap-3 text-sm"><span>{p.title} <span className="text-gray-500">for {p.clientName}</span></span><span className="tabular-nums text-gray-600">{formatPenceExact(p.totalPence)}</span></a></li>
            ))}
          </ul>
        </details>
      )}

      {preview ? (
        <QuoteDocument q={{
          businessName, title: q.title || 'Your job', description: q.description || null, clientName: q.client.name || 'Client',
          clientCompany: q.client.kind === 'company' ? q.client.companyName : null, jobAddress: q.client.jobAddress || null,
          lines: q.lines.filter(l => l.description || l.pricePence), vatApplies: vatRegistered && q.vatApplies, ...totals,
          deposit: { required: q.deposit.required, amountPence: dep, for: q.deposit.for, refundable: q.deposit.refundable, nonRefundableFrom: q.deposit.nonRefundableFrom },
          stages: plannedStages(q, totals.totalPence, dep), plannedStart: q.plannedStart,
          validUntil: new Date(Date.now() + q.validDays * 86_400_000).toISOString(), clientKind: q.client.kind,
          photos: q.photoPaths.map(p => previews[p]).filter(Boolean).map(url => ({ url })),
        }} />
      ) : (
        <>
          <ClientSection q={q} set={set} />
          <JobSection q={q} set={set} />
          <LinesSection q={q} set={set} savedItems={savedItems} vatRegistered={vatRegistered} />
          <DepositSection q={q} set={set} vatRegistered={vatRegistered} />
          <PaymentSection q={q} set={set} vatRegistered={vatRegistered} />
          <StartSection q={q} set={set} />
          <Card>
            <h2 className="text-base font-bold text-brand-navy">Photos</h2>
            <p className="mb-3 text-xs text-gray-500">Optional. Shown to the client with the quote.</p>
            <PhotoPicker folder="quotes" paths={q.photoPaths} previews={previews} onChange={(paths, pv) => { setPreviews(pv); set({ photoPaths: paths }) }} />
          </Card>
          <MoreSection q={q} set={set} />
        </>
      )}

      <div className="sticky bottom-16 z-20 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold tabular-nums text-brand-navy">{formatPenceExact(totals.totalPence)}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setPreview(p => !p)}>{preview ? 'Edit' : 'Preview'}</Button>
            <Button type="button" variant="outline" onClick={save} disabled={pending} className="hidden sm:inline-flex">Save draft</Button>
            <Button type="button" onClick={send} disabled={pending || blockers.length > 0}>{pending ? 'Working…' : 'Send'}</Button>
          </div>
        </div>
        <button type="button" onClick={save} disabled={pending} className="mt-1 min-h-[36px] text-sm font-medium text-gray-600 underline sm:hidden">Save draft</button>
        {notice && <p className="text-sm text-green-700">{notice}</p>}
        <ErrorText>{error}</ErrorText>
      </div>
    </div>
  )
}
