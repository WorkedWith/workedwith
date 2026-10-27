'use client'

import { useState, useTransition } from 'react'
import { decideEvidenceClaim, getEvidenceFileLink } from '@/actions/admin/decide-evidence'

type F = { id: string; label: string; by: string }

export function EvidenceDecision({ claimId, files }: { claimId: string; files: F[] }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function open(id: string) {
    start(async () => {
      const r = await getEvidenceFileLink(id)
      if (r.success) window.open(r.url, '_blank', 'noopener')
      else setError(r.error)
    })
  }
  function decide(d: 'upheld' | 'not_upheld') {
    setError(null)
    start(async () => {
      const r = await decideEvidenceClaim(claimId, d)
      if (r.success) setDone(d === 'upheld' ? 'Upheld, job confirmed' : 'Not upheld')
      else setError(r.error)
    })
  }

  if (done) return <p className="mt-4 text-sm font-medium text-green-700">{done}</p>

  return (
    <div className="mt-4">
      {files.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {files.map(f => (
            <li key={f.id}>
              <button type="button" onClick={() => open(f.id)} disabled={pending}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                {f.label} · {f.by}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => decide('upheld')} disabled={pending}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">Uphold, job happened</button>
        <button type="button" onClick={() => decide('not_upheld')} disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Do not uphold</button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
