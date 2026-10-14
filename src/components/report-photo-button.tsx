'use client'

import { useState, useTransition } from 'react'
import { reportPhoto } from '@/actions/gallery/report-photo'

type Props = { kind: 'gallery' | 'featured'; imageId: string }

export function ReportPhotoButton({ kind, imageId }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (done) return <p className="text-xs text-gray-500">Thanks, we will take a look.</p>

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
        Report this photo
      </button>
    )
  }

  function send() {
    setError(null)
    startTransition(async () => {
      const res = await reportPhoto({ kind, imageId, reason })
      if (res.success) setDone(true)
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={`report-${imageId}`} className="sr-only">Why are you reporting this photo?</label>
      <input
        id={`report-${imageId}`}
        type="text"
        value={reason}
        maxLength={300}
        onChange={e => setReason(e.target.value)}
        placeholder="Why? For example, not their work"
        disabled={isPending}
        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber sm:text-xs"
      />
      <div className="flex items-center gap-3">
        <button type="button" onClick={send} disabled={isPending} className="text-xs font-semibold text-brand-navy hover:underline disabled:opacity-50">
          {isPending ? 'Sending...' : 'Send report'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
