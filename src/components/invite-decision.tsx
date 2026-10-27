'use client'

import { useState, useTransition } from 'react'
import { claimTradeInvite } from '@/actions/claim-trade-invite'
import { declineTradeInvite } from '@/actions/decline-trade-invite'
import { confirmJob } from '@/actions/confirm-job'
import { declineJobInvite } from '@/actions/decline-job-invite'
import type { DeclineReason } from '@/types/database'

export function InviteDecision({ token, compact = false, kind = 'claim', requesterName }: { token: string; compact?: boolean; kind?: 'claim' | 'job'; requesterName?: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [declined, setDeclined] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [reason, setReason] = useState<DeclineReason | null>(null)
  const [note, setNote] = useState('')
  const who = requesterName?.trim() || 'They'

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
    if (!reason) {
      setError('Please choose a reason.')
      return
    }
    setError(null)
    startTransition(async () => {
      const r = kind === 'job' ? await declineJobInvite(token, reason, note) : await declineTradeInvite(token, reason, note)
      if (r.success) setDeclined(true)
      else setError(r.error)
    })
  }

  if (declined) {
    return <p className="text-sm text-gray-500">Declined. We have let {requesterName?.trim() || 'them'} know.</p>
  }

  return (
    <div>
      {confirmDecline ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-brand-navy">Why are you declining?</p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 has-[:checked]:border-brand-navy has-[:checked]:bg-gray-50">
              <input type="radio" name="decline-reason" className="mt-0.5" checked={reason === 'not_me'} onChange={() => setReason('not_me')} />
              <span>I didn&apos;t do this job, or this isn&apos;t me</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 has-[:checked]:border-brand-navy has-[:checked]:bg-gray-50">
              <input type="radio" name="decline-reason" className="mt-0.5" checked={reason === 'wont_confirm'} onChange={() => setReason('wont_confirm')} />
              <span>I don&apos;t want to confirm this job</span>
            </label>
          </div>
          {reason === 'wont_confirm' && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Declining counts towards your confirmation rate, which is shown on your profile. {who} can still send proof the job happened.
            </p>
          )}
          <label className="block text-sm text-gray-600">
            Anything we should know? Only WorkedWith sees this.
            <textarea
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 300))}
              rows={2}
              maxLength={300}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
            />
            <span className="block text-right text-xs text-gray-400">{note.length}/300</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={decline} disabled={pending || !reason}
              className="min-h-[44px] flex-1 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {pending ? 'Declining…' : 'Decline request'}
            </button>
            <button type="button" onClick={() => { setConfirmDecline(false); setReason(null); setNote(''); setError(null) }} disabled={pending}
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
