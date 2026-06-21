'use client'

import { useState, useTransition } from 'react'
import { resolveDispute } from '@/actions/admin/resolve-dispute'
import type { Dispute, Review, User } from '@/types/database'

export type DisputeEnriched = Dispute & {
  review: Pick<Review, 'written_review' | 'is_visible' | 'job_id'> | null
  raiser: Pick<User, 'id' | 'full_name' | 'email'> | null
  respondent: Pick<User, 'id' | 'full_name' | 'email'> | null
}

type FilterMode = 'all' | 'priority' | 'standard'

type Props = {
  disputes: DisputeEnriched[]
}

export function DisputeQueue({ disputes }: Props) {
  const [filter, setFilter] = useState<FilterMode>('all')

  const filtered = disputes.filter(d => {
    if (filter === 'priority') return d.is_priority
    if (filter === 'standard') return !d.is_priority
    return true
  })

  const priorityCount = disputes.filter(d => d.is_priority).length

  return (
    <div className="space-y-4">
      {/* Filter toggle */}
      <div className="flex items-center gap-2">
        {(['all', 'priority', 'standard'] as FilterMode[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-brand-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' && `All (${disputes.length})`}
            {f === 'priority' && `Priority only (${priorityCount})`}
            {f === 'standard' && `Standard (${disputes.length - priorityCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-500">No disputes in this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <DisputeRow key={d.id} dispute={d} />
          ))}
        </div>
      )}
    </div>
  )
}

const reasonLabels: Record<string, string> = {
  job_did_not_happen: 'Job did not happen',
  factually_incorrect: 'Factually incorrect',
  defamatory: 'Defamatory',
  wrong_person: 'Wrong person',
  other: 'Other',
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

function DisputeRow({ dispute }: { dispute: DisputeEnriched }) {
  const [expanded, setExpanded] = useState(false)
  const [amending, setAmending] = useState(false)
  const [amendText, setAmendText] = useState(dispute.review?.written_review ?? '')
  const [adminNotes, setAdminNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const days = daysUntil(dispute.decision_deadline)

  function decide(decision: 'review_kept' | 'review_removed' | 'review_amended') {
    if (decision === 'review_amended' && !amending) {
      setAmending(true)
      setExpanded(true)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await resolveDispute({
        disputeId: dispute.id,
        decision,
        adminNotes: adminNotes || undefined,
        amendedText: decision === 'review_amended' ? amendText : undefined,
      })
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${
      days <= 2 ? 'border-red-200' : dispute.is_priority ? 'border-amber-300' : days <= 5 ? 'border-amber-200' : 'border-gray-200'
    }`}>
      {/* Summary row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {dispute.is_priority && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                Pro — Priority
              </span>
            )}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {reasonLabels[dispute.reason] ?? dispute.reason}
            </span>
            <span className={`text-xs font-semibold ${
              days <= 2 ? 'text-red-600' : days <= 5 ? 'text-amber-600' : 'text-gray-400'
            }`}>
              {days === 0 ? 'Due today' : `${days}d until deadline`}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-700 line-clamp-2">
            {dispute.review?.written_review ? `"${dispute.review.written_review}"` : 'No written review'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Raised by <span className="font-medium text-gray-600">{dispute.raiser?.full_name ?? '—'}</span>
            {' against '}
            <span className="font-medium text-gray-600">{dispute.respondent?.full_name ?? '—'}</span>
          </p>
        </div>
        <ChevronIcon expanded={expanded} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailCard label="Dispute details">
              <p className="text-sm text-gray-700">{dispute.details}</p>
            </DetailCard>
            <DetailCard label="Respondent evidence">
              {dispute.respondent_evidence
                ? <p className="text-sm text-gray-700">{dispute.respondent_evidence}</p>
                : <p className="text-sm text-gray-400 italic">No evidence submitted</p>
              }
            </DetailCard>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <p><span className="font-medium">Raiser:</span> {dispute.raiser?.full_name} &lt;{dispute.raiser?.email}&gt;</p>
              <p className="mt-0.5"><span className="font-medium">Raised:</span> {new Date(dispute.raised_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div>
              <p><span className="font-medium">Respondent:</span> {dispute.respondent?.full_name} &lt;{dispute.respondent?.email}&gt;</p>
              <p className="mt-0.5"><span className="font-medium">Evidence deadline:</span> {new Date(dispute.evidence_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Amend text input */}
          {amending && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amended review text</label>
              <textarea
                value={amendText}
                onChange={e => setAmendText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
              />
            </div>
          )}

          {/* Admin notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin notes (internal)</label>
            <input
              type="text"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Optional notes for the audit trail…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => decide('review_kept')}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {isPending ? 'Saving…' : 'Keep review'}
            </button>
            <button
              onClick={() => decide('review_removed')}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              Remove review
            </button>
            <button
              onClick={() => decide('review_amended')}
              disabled={isPending}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                amending
                  ? 'bg-brand-amber text-brand-navy hover:bg-amber-400'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {amending ? 'Save amendment' : 'Amend review'}
            </button>
            {amending && (
              <button
                onClick={() => { setAmending(false); setAmendText(dispute.review?.written_review ?? '') }}
                disabled={isPending}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel amend
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}
