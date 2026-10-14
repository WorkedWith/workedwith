'use client'

import { useState, useTransition } from 'react'
import { moderateGalleryImage, resolvePhotoReport } from '@/actions/gallery/admin-photos'

type Props =
  | { mode: 'moderate'; id: string }
  | { mode: 'report'; id: string }

export function PhotoButtons(props: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run(label: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) setDone(label)
      else setError(res.error ?? 'Something went wrong.')
    })
  }

  if (done) return <span className="text-xs font-semibold text-gray-600">{done}</span>

  const green = 'rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40'
  const red = 'rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40'

  return (
    <div className="flex items-center gap-2">
      {props.mode === 'moderate' ? (
        <>
          <button className={green} disabled={isPending} onClick={() => run('Approved', () => moderateGalleryImage(props.id, 'approved'))}>Approve</button>
          <button className={red} disabled={isPending} onClick={() => run('Rejected', () => moderateGalleryImage(props.id, 'rejected'))}>Reject</button>
        </>
      ) : (
        <>
          <button className={red} disabled={isPending} onClick={() => run('Photo removed', () => resolvePhotoReport(props.id, 'remove'))}>Remove photo</button>
          <button className={green} disabled={isPending} onClick={() => run('Dismissed', () => resolvePhotoReport(props.id, 'dismiss'))}>Dismiss</button>
        </>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
