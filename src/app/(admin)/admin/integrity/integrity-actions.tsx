'use client'

import { useTransition } from 'react'
import { updateIntegrityFlag } from '@/actions/admin/update-integrity-flag'

export function IntegrityFlagActions({ flagId }: { flagId: string }) {
  const [isPending, startTransition] = useTransition()

  function handle(outcome: 'dismissed' | 'actioned') {
    startTransition(async () => {
      await updateIntegrityFlag(flagId, outcome)
    })
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        onClick={() => handle('dismissed')}
        disabled={isPending}
        className="min-h-[36px] rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
      >
        Dismiss
      </button>
      <button
        onClick={() => handle('actioned')}
        disabled={isPending}
        className="min-h-[36px] rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
      >
        Action
      </button>
    </div>
  )
}
