'use client'

import { useState, useTransition } from 'react'
import { confirmStartDate, proposeStartDate } from '@/actions/job-events'
import { Button, ErrorText, Input } from '@/components/ui'
import { EARLY_START_CONSENT } from '@/lib/quotes/wording'

export function ProposeStartForm({ jobId, label, askConsentBefore }: { jobId: string; label: string; askConsentBefore: string | null }) {
  const [date, setDate] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const inside = !!askConsentBefore && !!date && new Date(date) < new Date(askConsentBefore)
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input type="date" aria-label="Date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} className="sm:max-w-[200px]" />
        <Button type="button" variant="outline" disabled={!date || pending} onClick={() => {
          setError(null)
          start(async () => {
            const r = await proposeStartDate(jobId, date, consent)
            if (r.ok) window.location.reload()
            else setError(r.error)
          })
        }}>{pending ? 'Sending…' : label}</Button>
      </div>
      {inside && (
        <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span>{EARLY_START_CONSENT}</span>
        </label>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}

export function ConfirmStartButton({ proposalId, needsConsent }: { proposalId: string; needsConsent: boolean }) {
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-2">
      {needsConsent && (
        <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span>{EARLY_START_CONSENT}</span>
        </label>
      )}
      <Button type="button" full disabled={pending || (needsConsent && !consent)} onClick={() => {
        setError(null)
        start(async () => {
          const r = await confirmStartDate(proposalId, consent)
          if (r.ok) window.location.reload()
          else setError(r.error)
        })
      }}>{pending ? 'Confirming…' : 'Confirm this date'}</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
