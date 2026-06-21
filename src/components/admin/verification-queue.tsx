'use client'

import { useState, useTransition } from 'react'
import { approveVerification } from '@/actions/admin/approve-verification'
import { rejectVerification } from '@/actions/admin/reject-verification'
import type { VerificationDocument, User } from '@/types/database'

export type VerificationDocWithUser = VerificationDocument & {
  user: Pick<User, 'id' | 'full_name' | 'email'> | null
  signedUrl: string | null
}

type Props = {
  docs: VerificationDocWithUser[]
}

export function VerificationQueue({ docs }: Props) {
  if (docs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-gray-500">No pending verifications</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {docs.map(doc => (
        <VerificationRow key={doc.id} doc={doc} />
      ))}
    </div>
  )
}

function VerificationRow({ doc }: { doc: VerificationDocWithUser }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveVerification(doc.id)
      if (!result.success) setError(result.error)
    })
  }

  function handleReject() {
    if (!rejecting) { setRejecting(true); return }
    if (!reason.trim()) { setError('Please enter a rejection reason'); return }
    setError(null)
    startTransition(async () => {
      const result = await rejectVerification(doc.id, reason)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* User info */}
        <div>
          <p className="font-semibold text-gray-900">{doc.user?.full_name ?? '—'}</p>
          <p className="text-sm text-gray-500">{doc.user?.email ?? '—'}</p>
          <p className="mt-1 text-xs text-gray-400">
            Submitted {new Date(doc.submitted_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>

        {/* Document link */}
        {doc.signedUrl ? (
          <a
            href={doc.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-amber hover:underline shrink-0"
          >
            <DocumentIcon />
            View document
          </a>
        ) : (
          <span className="text-xs text-gray-400 italic">Document unavailable</span>
        )}
      </div>

      {/* Reject reason input */}
      {rejecting && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rejection reason</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Document unclear, ID not visible, wrong document type..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleApprove}
          disabled={isPending || rejecting}
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          {isPending && !rejecting ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={handleReject}
          disabled={isPending && rejecting}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
            rejecting
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-red-300 text-red-600 hover:bg-red-50'
          }`}
        >
          {isPending && rejecting ? 'Rejecting…' : rejecting ? 'Confirm rejection' : 'Reject'}
        </button>
        {rejecting && (
          <button
            onClick={() => { setRejecting(false); setReason(''); setError(null) }}
            disabled={isPending}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function DocumentIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7Z" clipRule="evenodd" />
    </svg>
  )
}
