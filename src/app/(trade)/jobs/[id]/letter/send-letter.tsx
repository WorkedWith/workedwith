'use client'

import { useState, useTransition } from 'react'
import { sendLetterBeforeAction } from '@/actions/chasing'
import { Button, ErrorText, Notice } from '@/components/ui'

export function SendLetter({ jobId, company }: { jobId: string; company: boolean }) {
  const [interest, setInterest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()
  if (sent) return <Notice tone="green">Sent. The client has been emailed a link to read it in their account. You can download it below to post.</Notice>
  return (
    <div className="space-y-3">
      {company && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5" checked={interest} onChange={e => setInterest(e.target.checked)} />
          <span>Add statutory late payment interest and fixed compensation under the Late Payment of Commercial Debts (Interest) Act.</span>
        </label>
      )}
      <a href={`/api/legal/letter/${jobId}${interest ? '?interest=1' : ''}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[48px] items-center rounded-xl border-2 border-brand-navy px-5 text-sm font-semibold text-brand-navy">Preview the letter (PDF)</a>
      <Button type="button" full disabled={pending} onClick={() => {
        if (!window.confirm('Send this letter before action to the client now?')) return
        start(async () => {
          const r = await sendLetterBeforeAction(jobId, interest)
          if (r.ok) { setSent(true); window.location.reload() }
          else setError(r.error)
        })
      }}>{pending ? 'Sending…' : 'Send the letter'}</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
