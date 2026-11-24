'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadSitePhoto } from '@/actions/quotes'

/** Add photos from the camera or the phone's gallery. Shared by quotes, stages and variations. */
export function PhotoPicker({ paths, previews, onChange, folder, max = 10, label = 'Add photos' }: {
  paths: string[]
  previews?: Record<string, string>
  onChange: (paths: string[], previews: Record<string, string>) => void
  folder: string
  max?: number
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const local = previews ?? {}

  function pick(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    start(async () => {
      let next = [...paths]
      const nextPreviews = { ...local }
      for (const f of Array.from(files).slice(0, max - paths.length)) {
        const fd = new FormData()
        fd.set('file', f)
        fd.set('folder', folder)
        const r = await uploadSitePhoto(fd)
        if (r.ok && r.data) {
          next = [...next, r.data.path]
          nextPreviews[r.data.path] = URL.createObjectURL(f)
        } else if (!r.ok) setError(r.error)
      }
      onChange(next, nextPreviews)
    })
  }

  return (
    <div>
      {paths.length > 0 && (
        <ul className="mb-3 grid grid-cols-4 gap-2">
          {paths.map(p => (
            <li key={p} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              {local[p] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={local[p]} alt="" className="h-full w-full object-cover" />
              )}
              <button type="button" onClick={() => onChange(paths.filter(x => x !== p), local)} aria-label="Remove photo" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white">✕</button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={e => pick(e.target.files)} />
      {paths.length < max && (
        <button type="button" onClick={() => input.current?.click()} disabled={pending} className="min-h-[48px] rounded-xl border-2 border-dashed border-gray-300 px-4 text-sm font-semibold text-brand-navy disabled:opacity-50">
          {pending ? 'Uploading…' : `📷 ${label}`}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
