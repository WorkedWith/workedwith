'use client'

import { useState, useTransition } from 'react'
import { moderateFeaturedImage } from '@/actions/featured-jobs/moderate-featured-image'

export function ImageModerationButtons({ imageId }: { imageId: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handle(status: 'approved' | 'rejected') {
    setError(null)
    startTransition(async () => {
      const result = await moderateFeaturedImage(imageId, status)
      if (result.success) {
        setDone(status)
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <span className={`text-xs font-semibold ${done === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
        {done === 'approved' ? 'Approved' : 'Rejected'}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handle('approved')}
        disabled={isPending}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
      >
        Approve
      </button>
      <button
        onClick={() => handle('rejected')}
        disabled={isPending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
      >
        Reject
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
