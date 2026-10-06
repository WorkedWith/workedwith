'use client'

import { useState, useTransition } from 'react'
import { reportIncorrectClaim } from '@/actions/report-incorrect-claim'

export function ReportClaimButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<'idle' | 'confirm' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleReport() {
    startTransition(async () => {
      const result = await reportIncorrectClaim(jobId)
      if (result.success) {
        setState('done')
      } else {
        setErrorMsg(result.error)
        setState('error')
      }
    })
  }

  if (state === 'done') {
    return (
      <p className="text-sm text-gray-500 text-center">
        Claim reported. Our team will review it shortly.
      </p>
    )
  }

  if (state === 'error') {
    return (
      <p className="text-sm text-red-600 text-center">{errorMsg}</p>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-gray-600">
          Are you sure? This will flag the claim for admin review.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={handleReport}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Reporting…' : 'Yes, report it'}
          </button>
          <button
            type="button"
            onClick={() => setState('idle')}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setState('confirm')}
      className="text-xs text-gray-400 hover:text-red-600 transition-colors underline"
    >
      Report incorrect claim
    </button>
  )
}
