'use client'

import { useState, useTransition } from 'react'
import { cancelJob } from '@/actions/stages'
import { Button, ErrorText, TextArea } from '@/components/ui'

export function CancelJobForm({ jobId }: { jobId: string }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Amounts already due stay due. Stages not started are cancelled. If work had started, you can both review each other.</p>
      <TextArea rows={2} aria-label="Reason" placeholder="Reason for cancelling" value={reason} onChange={e => setReason(e.target.value)} />
      <Button type="button" variant="danger" full disabled={pending} onClick={() => {
        if (!window.confirm('Cancel this job? This can’t be undone.')) return
        start(async () => {
          const r = await cancelJob(jobId, reason)
          if (r.ok) window.location.reload()
          else setError(r.error)
        })
      }}>Cancel job</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
