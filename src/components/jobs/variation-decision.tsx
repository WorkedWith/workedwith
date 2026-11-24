'use client'

import { useState, useTransition } from 'react'
import { decideVariation } from '@/actions/variations'
import { Button, ErrorText, TextArea } from '@/components/ui'

export function VariationDecision({ variationId }: { variationId: string }) {
  const [declining, setDeclining] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const run = (approve: boolean) => start(async () => {
    const r = await decideVariation(variationId, approve, note)
    if (r.ok) window.location.reload()
    else setError(r.error)
  })
  return (
    <div className="mt-3 space-y-2">
      {!declining ? (
        <>
          <Button type="button" full disabled={pending} onClick={() => run(true)}>Approve the change</Button>
          <Button type="button" full variant="outline" onClick={() => setDeclining(true)}>Decline</Button>
        </>
      ) : (
        <>
          <TextArea rows={2} aria-label="Note (optional)" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <Button type="button" full variant="danger" disabled={pending} onClick={() => run(false)}>Decline the change</Button>
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
