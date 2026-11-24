'use client'

import { useState, useTransition } from 'react'
import { acceptQuote, declineQuote, requestQuoteChanges } from '@/actions/quotes'
import { Button, ErrorText, TextArea } from '@/components/ui'
import { formatPence } from '@/lib/money'

type Props = {
  quoteId: string
  isPerson: boolean
  consentNeeded: boolean
  consentWording: string
  deposit: { required: boolean; amountPence: number; wording: string | null }
}

type Mode = 'accept' | 'changes' | 'decline'

export function AcceptPanel({ quoteId, isPerson, consentNeeded, consentWording, deposit }: Props) {
  const [mode, setMode] = useState<Mode>('accept')
  const [terms, setTerms] = useState(false)
  const [cancel, setCancel] = useState(false)
  const [consent, setConsent] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; error?: string; data?: { jobId: string } }>, message: string) {
    setError(null)
    start(async () => {
      const r = await fn()
      if (!r.ok) return setError(r.error ?? 'Something went wrong.')
      if (r.data?.jobId) window.location.href = `/my/jobs/${r.data.jobId}?accepted=1`
      else setDone(message)
    })
  }

  if (done) return <p className="rounded-2xl bg-green-50 p-4 text-base text-green-900">{done}</p>

  return (
    <div className="space-y-4 rounded-2xl border-2 border-brand-amber bg-white p-5">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1" role="tablist">
        {(['accept', 'changes', 'decline'] as Mode[]).map(m => (
          <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => setMode(m)}
            className={`min-h-[44px] rounded-lg text-sm font-semibold ${mode === m ? 'bg-white text-brand-navy shadow' : 'text-gray-600'}`}>
            {m === 'accept' ? 'Accept' : m === 'changes' ? 'Ask for changes' : 'Decline'}
          </button>
        ))}
      </div>

      {mode === 'accept' && (
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0" checked={terms} onChange={e => setTerms(e.target.checked)} /><span>I have read the terms below.</span></label>
          {isPerson && <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0" checked={cancel} onChange={e => setCancel(e.target.checked)} /><span>I have read the cancellation notice, including my 14 day right to cancel.</span></label>}
          {consentNeeded && (
            <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span>{consentWording} <span className="block text-xs text-gray-600">Optional. Without it the work can’t start until your 14 days are up.</span></span>
            </label>
          )}
          {deposit.required && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-800"><strong>Deposit of {formatPence(deposit.amountPence)}</strong> to book the job in. {deposit.wording}</p>}
          <Button type="button" full disabled={pending || !terms || (isPerson && !cancel)}
            onClick={() => run(() => acceptQuote({ quoteId, termsAgreed: terms, cancellationRead: cancel, earlyStartConsent: consent }), '')}>
            {pending ? 'Accepting…' : deposit.required ? 'Accept and see how to pay the deposit' : 'Accept quote'}
          </Button>
        </div>
      )}

      {mode === 'changes' && (
        <div className="space-y-3">
          <TextArea rows={3} aria-label="What would you like changed?" placeholder="Can you price it without the vanity unit?" value={note} onChange={e => setNote(e.target.value)} />
          <Button type="button" full variant="navy" disabled={pending} onClick={() => run(() => requestQuoteChanges(quoteId, note), 'Sent. The trade will update the quote and send you a new version.')}>Send to the trade</Button>
        </div>
      )}

      {mode === 'decline' && (
        <div className="space-y-3">
          <TextArea rows={2} aria-label="Reason (optional)" placeholder="Reason (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <Button type="button" full variant="danger" disabled={pending} onClick={() => run(() => declineQuote(quoteId, note), 'You have declined this quote. The trade has been told.')}>Decline quote</Button>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
