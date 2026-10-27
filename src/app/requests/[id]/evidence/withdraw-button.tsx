'use client'

import { useState, useTransition } from 'react'
import { withdrawEvidenceClaim } from '@/actions/evidence'

export function WithdrawButton({ claimId }: { claimId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function withdraw() {
    setError(null)
    startTransition(async () => {
      const r = await withdrawEvidenceClaim(claimId)
      if (r.success) window.location.href = '/dashboard'
      else setError(r.error)
    })
  }

  return (
    <div>
      <button type="button" onClick={withdraw} disabled={pending}
        className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
        {pending ? 'Withdrawing…' : 'Withdraw my proof'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
