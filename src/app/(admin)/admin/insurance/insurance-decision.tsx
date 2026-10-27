'use client'

import { useState, useTransition } from 'react'
import { decideInsurance, getInsuranceFileLink } from '@/actions/admin/decide-insurance'

export function InsuranceDecision({ id }: { id: string }) {
  const [pending, start] = useTransition()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function open() {
    start(async () => {
      const r = await getInsuranceFileLink(id)
      if (r.success) window.open(r.url, '_blank', 'noopener')
      else setError(r.error)
    })
  }
  function decide(d: 'approve' | 'reject') {
    setError(null)
    start(async () => {
      const r = await decideInsurance(id, d, reason)
      if (r.success) setDone(d === 'approve' ? 'Approved, tag is live' : 'Rejected, trade has been emailed')
      else setError(r.error)
    })
  }

  if (done) return <p className="mt-4 text-sm font-medium text-green-700">{done}</p>
  return (
    <div className="mt-4 space-y-3">
      <button type="button" onClick={open} disabled={pending}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Open certificate</button>
      <label className="block text-xs font-medium text-gray-600">
        Reason if rejecting (sent to the trade)
        <input value={reason} onChange={e => setReason(e.target.value.slice(0, 300))}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => decide('approve')} disabled={pending}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">Approve</button>
        <button type="button" onClick={() => decide('reject')} disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Reject</button>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
