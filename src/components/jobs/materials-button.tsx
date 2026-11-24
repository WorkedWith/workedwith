'use client'

import { useState, useTransition } from 'react'
import { markMaterialsOrdered } from '@/actions/job-events'
import { Button, ErrorText } from '@/components/ui'
import { PhotoPicker } from '@/components/quotes/photo-picker'

export function MaterialsOrderedButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [paths, setPaths] = useState<string[]>([])
  const [pv, setPv] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (!open) return <Button type="button" variant="outline" onClick={() => setOpen(true)}>Materials ordered</Button>
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-3">
      <p className="text-sm text-gray-700">Add a photo of the order or receipt if you have one. The client is told straight away.</p>
      <PhotoPicker folder="materials" paths={paths} previews={pv} max={1} label="Add a photo" onChange={(p, v) => { setPaths(p); setPv(v) }} />
      <Button type="button" full disabled={pending} onClick={() => start(async () => {
        const r = await markMaterialsOrdered(jobId, paths[0] ?? null)
        if (r.ok) window.location.reload()
        else setError(r.error)
      })}>{pending ? 'Saving…' : 'Confirm materials ordered'}</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
