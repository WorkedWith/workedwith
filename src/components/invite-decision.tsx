'use client'

import { useState, useTransition } from 'react'
import { claimTradeInvite } from '@/actions/claim-trade-invite'
import { declineTradeInvite } from '@/actions/decline-trade-invite'
import { confirmJob } from '@/actions/confirm-job'
import { declineJobInvite } from '@/actions/decline-job-invite'

export function InviteDecision({ token, compact = false, kind = 'claim' }: { token: string; compact?: boolean; kind?: 'claim' | 'job' }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [declined, setDeclined] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)

  function accept() {
    setError(null)
    startTransition(async () => {
      if (kind === 'job') {
        const r = await confirmJob(token)
        if (r.success) {
          // Clients cannot open the trade's job page, so past jobs go to the review and live jobs to the dashboard.
          window.location.href = r.isBackdated ? `/jobs/${r.jobId}/review?confirmed=1` : '/dashboard'
        } else {
          setError(r.error)
        }
        return
      }
      const r = await claimTradeInvite(token)
      if (r.success) {
        window.location.href = `/jobs/${r.jobIds[0]}/review`
      } else {
        setError(r.error)
      }
    })
  }

  function decline() {
    setError(null)
    startTransition(async () => {
      const r = kind === 'job' ? await declineJobInvite(token) : await declineTradeInvite(token)
      if (r.success) setDeclined(true)
      else setError(r.error)
    })
  }

  if (declined) {
    return <p className="text-sm text-gray-500">Declined. We have let the client know.</p>
  }

  return (
    <div>
      {confirmDecline ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Decline this request? The client will be told you did not do this job with them.</p>
          <div className="flex gap-2">
            <button type="button" onClick={decline} disabled={pending}
              className="min-h-[44px] flex-1 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {pending ? 'Declining…' : 'Yes, decline'}
            </button>
            <button type="button" onClick={() => setConfirmDecline(false)} disabled={pending}
              className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex gap-2 ${compact ? '' : 'flex-col sm:flex-row'}`}>
          <button type="button" onClick={accept} disabled={pending}
            className="min-h-[44px] flex-1 rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50">
            {pending ? 'Working…' : 'Accept'}
          </button>
          <button type="button" onClick={() => setConfirmDecline(true)} disabled={pending}
            className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Decline
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
