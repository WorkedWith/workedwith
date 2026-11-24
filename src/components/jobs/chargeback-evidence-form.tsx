'use client'

import { useState, useTransition } from 'react'
import { submitChargebackEvidence } from '@/actions/cards'
import { Button, ErrorText, TextArea } from '@/components/ui'

export function ChargebackEvidenceForm({ chargebackId }: { chargebackId: string }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">We include the accepted quote, terms and acceptance record, variations, stage approvals or requests, photos, invoices and reminders. Add anything else you want Stripe to see.</p>
      <TextArea rows={3} aria-label="Your notes" placeholder="Your notes (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <Button type="button" full disabled={pending} onClick={() => start(async () => {
        const r = await submitChargebackEvidence(chargebackId, note)
        if (r.ok) window.location.reload()
        else setError(r.error)
      })}>{pending ? 'Submitting…' : 'Submit evidence to Stripe'}</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
