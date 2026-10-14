'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadGalleryImage } from '@/actions/gallery/upload-gallery-image'
import { deleteGalleryImage } from '@/actions/gallery/delete-gallery-image'
import type { GalleryImageOwner } from './page'

type Props = {
  images: GalleryImageOwner[]
  limit: number
  isPro: boolean
  supabaseUrl: string
}

type Pending = { file: File; preview: string; caption: string }

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting review',
  rejected: 'Removed by moderation',
}

export function GalleryClient({ images, limit, isPro, supabaseUrl }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<Pending[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const used = images.filter(i => i.moderation_status !== 'rejected').length
  const room = Math.max(0, limit - used)

  function addFiles(list: FileList | null) {
    if (!list) return
    setError(null)
    const next: Pending[] = []
    for (const file of Array.from(list)) {
      if (!ALLOWED.includes(file.type)) { setError('Only JPG, PNG and WebP images are allowed.'); continue }
      if (file.size > MAX_BYTES) { setError('Each image must be 10 MB or smaller.'); continue }
      if (pending.length + next.length >= room) { setError(`You can add ${room} more photo${room === 1 ? '' : 's'} on your plan.`); break }
      next.push({ file, preview: URL.createObjectURL(file), caption: '' })
    }
    setPending(prev => [...prev, ...next])
    if (inputRef.current) inputRef.current.value = ''
  }

  function removePending(i: number) {
    setPending(prev => {
      URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function upload() {
    setError(null)
    startTransition(async () => {
      const failures: string[] = []
      for (const p of pending) {
        const fd = new FormData()
        fd.append('file', p.file)
        fd.append('caption', p.caption)
        const res = await uploadGalleryImage(fd)
        if (!res.success) failures.push(res.error)
      }
      pending.forEach(p => URL.revokeObjectURL(p.preview))
      setPending([])
      if (failures.length > 0) setError(failures[0])
      router.refresh()
    })
  }

  function remove(id: string) {
    setRemovingId(id)
    startTransition(async () => {
      const res = await deleteGalleryImage(id)
      if (!res.success) setError(res.error)
      setRemovingId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Show clients it is your work</p>
        <p className="mt-1 leading-relaxed">
          Photos that show you were there build the most trust. Try to get your branded A frame board outside the property,
          your van or signage, or your business card in shot. Only add photos of work you did yourself.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {used} of {limit} photos used
        </span>
        {isPro ? (
          <Link href="/profile/featured-jobs" className="font-semibold text-brand-navy underline">
            Add photos to a confirmed job
          </Link>
        ) : (
          <Link href="/subscription" className="font-semibold text-brand-navy underline">
            Pro adds 10 photos and job photos
          </Link>
        )}
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map(img => (
            <li key={img.id} className="space-y-1.5">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/featured-job-images/${img.storage_path}`}
                  alt={img.caption ?? 'Photo of your work'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {img.moderation_status !== 'approved' && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {STATUS_LABELS[img.moderation_status]}
                  </span>
                )}
              </div>
              {img.caption && <p className="text-xs leading-relaxed text-gray-500">{img.caption}</p>}
              <button
                type="button"
                onClick={() => remove(img.id)}
                disabled={isPending}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
              >
                {removingId === img.id ? 'Removing...' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {room > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label htmlFor="gallery-files" className="block text-sm font-medium text-gray-700">
              Add photos <span className="font-normal text-gray-400">(JPG, PNG or WebP, 10 MB each)</span>
            </label>
            <input
              id="gallery-files"
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isPending}
              onChange={e => addFiles(e.target.files)}
              className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:h-11 file:rounded-lg file:border-0 file:bg-brand-navy file:px-4 file:text-sm file:font-semibold file:text-white"
            />
          </div>

          {pending.length > 0 && (
            <ul className="space-y-3">
              {pending.map((p, i) => (
                <li key={p.preview} className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`caption-${i}`} className="sr-only">Caption</label>
                    <input
                      id={`caption-${i}`}
                      type="text"
                      value={p.caption}
                      maxLength={140}
                      placeholder="Caption, for example Bathroom retile in Didsbury"
                      disabled={isPending}
                      onChange={e => setPending(prev => prev.map((x, idx) => idx === i ? { ...x, caption: e.target.value } : x))}
                      className="h-11 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      disabled={isPending}
                      className="mt-1 text-xs font-medium text-gray-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pending.length > 0 && (
            <button
              type="button"
              onClick={upload}
              disabled={isPending}
              className="h-12 w-full rounded-lg bg-brand-amber px-5 text-sm font-bold text-brand-navy hover:bg-amber-400 disabled:opacity-60 sm:w-auto"
            >
              {isPending ? 'Uploading...' : `Upload ${pending.length} photo${pending.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          You have used all {limit} photos on your plan. Remove one to add another.
        </p>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">
        Photos are checked automatically and by our team if needed. Anyone viewing your profile can report a photo.
      </p>
    </div>
  )
}
