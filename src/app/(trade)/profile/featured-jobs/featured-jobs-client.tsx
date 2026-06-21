'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { createFeaturedJob } from '@/actions/featured-jobs/create-featured-job'
import { uploadFeaturedImage } from '@/actions/featured-jobs/upload-featured-image'
import { deleteFeaturedImage } from '@/actions/featured-jobs/delete-featured-image'
import { deleteFeaturedJob } from '@/actions/featured-jobs/delete-featured-job'
import type { FeaturedJobOwner, CompletedJobOption } from './page'

type PendingFile = {
  file: File
  preview: string
  caption: string
}

type Props = {
  featuredJobs: FeaturedJobOwner[]
  completedJobs: CompletedJobOption[]
  jobLimit: number
  imageLimit: number
  atJobLimit: boolean
  supabaseUrl: string
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

function imgUrl(supabaseUrl: string, storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/featured-job-images/${storagePath}`
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Removed by moderation',
}
const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

export function FeaturedJobsClient({
  featuredJobs: initialJobs,
  completedJobs,
  jobLimit,
  imageLimit,
  atJobLimit,
  supabaseUrl,
}: Props) {
  const [jobs, setJobs] = useState<FeaturedJobOwner[]>(initialJobs)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [linkedJobId, setLinkedJobId] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [uploadedCount, setUploadedCount] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDraggingRef = useRef(false)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    setFileError(null)
    const next: PendingFile[] = []
    for (const file of Array.from(incoming)) {
      if (!ALLOWED.includes(file.type)) {
        setFileError('Only JPG, PNG, and WebP images are allowed.')
        continue
      }
      if (file.size > MAX_BYTES) {
        setFileError('Each image must be 10 MB or smaller.')
        continue
      }
      if (pendingFiles.length + next.length >= imageLimit) {
        setFileError(`Maximum ${imageLimit} images per featured job.`)
        break
      }
      next.push({ file, preview: URL.createObjectURL(file), caption: '' })
    }
    setPendingFiles(prev => [...prev, ...next])
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingRef.current = false
    addFiles(e.dataTransfer.files)
  }, [pendingFiles.length, imageLimit]) // eslint-disable-line react-hooks/exhaustive-deps

  function removeFile(index: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  function updateCaption(index: number, caption: string) {
    setPendingFiles(prev => prev.map((f, i) => i === index ? { ...f, caption } : f))
  }

  function resetForm() {
    setTitle('')
    setLinkedJobId('')
    pendingFiles.forEach(f => URL.revokeObjectURL(f.preview))
    setPendingFiles([])
    setFileError(null)
    setFormError(null)
    setSuccess(false)
    setUploadedCount(0)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setFormError('Please enter a title.'); return }
    setFormError(null)
    setUploadedCount(0)

    startTransition(async () => {
      // 1. Create the featured job row
      const createResult = await createFeaturedJob({
        title: title.trim(),
        job_id: linkedJobId || undefined,
      })

      if (!createResult.success) {
        setFormError(createResult.error)
        return
      }

      const featuredJobId = createResult.featuredJobId

      // 2. Upload each image sequentially
      const uploaded: FeaturedJobOwner['images'] = []
      for (let i = 0; i < pendingFiles.length; i++) {
        const fd = new FormData()
        fd.append('featuredJobId', featuredJobId)
        fd.append('file', pendingFiles[i].file)
        fd.append('caption', pendingFiles[i].caption)
        const uploadResult = await uploadFeaturedImage(fd)
        if (!uploadResult.success) {
          setFormError(`Image ${i + 1}: ${uploadResult.error}`)
          return
        }
        setUploadedCount(i + 1)
        uploaded.push({
          id: uploadResult.imageId,
          storage_path: uploadResult.storagePath,
          caption: pendingFiles[i].caption || null,
          display_order: i,
          moderation_status: 'pending',
        })
      }

      // 3. Update local state
      const newJob: FeaturedJobOwner = {
        id: featuredJobId,
        title: title.trim(),
        job_id: linkedJobId || null,
        created_at: new Date().toISOString(),
        images: uploaded,
      }
      setJobs(prev => [newJob, ...prev])
      setSuccess(true)
      resetForm()
      setShowForm(false)
    })
  }

  function handleDeleteImage(jobId: string, imageId: string) {
    startTransition(async () => {
      const result = await deleteFeaturedImage(imageId)
      if (result.success) {
        setJobs(prev => prev.map(j =>
          j.id === jobId
            ? { ...j, images: j.images.filter(img => img.id !== imageId) }
            : j
        ))
      }
    })
  }

  function handleDeleteJob(jobId: string) {
    if (!confirm('Delete this featured job and all its images?')) return
    startTransition(async () => {
      const result = await deleteFeaturedJob(jobId)
      if (result.success) {
        setJobs(prev => prev.filter(j => j.id !== jobId))
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Success flash */}
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Featured job added. Images are under review and will appear on your profile once approved.
        </div>
      )}

      {/* Add button / limit notice */}
      {!showForm && (
        <div>
          {atJobLimit ? (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500">
              You have reached the limit of {jobLimit} featured jobs for your plan.
              <a href="/subscription" className="ml-1 font-medium text-brand-amber hover:underline">
                Upgrade to add more →
              </a>
            </div>
          ) : (
            <button
              onClick={() => { setSuccess(false); setShowForm(true) }}
              className="rounded-lg bg-brand-amber px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              + Add featured job
            </button>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5"
        >
          <h2 className="text-lg font-semibold text-brand-navy">New featured job</h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Full bathroom renovation, Fitzrovia"
              maxLength={120}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber disabled:opacity-50"
            />
          </div>

          {/* Optional linked job */}
          {completedJobs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Link to a confirmed job <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={linkedJobId}
                onChange={e => setLinkedJobId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber disabled:opacity-50"
              >
                <option value="">No linked job</option>
                {completedJobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.job_type} — {j.postcode}
                    {j.completed_at ? ` (${new Date(j.completed_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Images <span className="text-gray-400 font-normal">(max {imageLimit}, JPG/PNG/WebP, 10 MB each)</span>
            </label>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); isDraggingRef.current = true }}
              onDragLeave={() => { isDraggingRef.current = false }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center hover:border-brand-amber hover:bg-amber-50/30 transition-colors"
            >
              <svg className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-gray-500">Drag and drop images here, or <span className="font-medium text-brand-amber">click to browse</span></p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={e => addFiles(e.target.files)}
                disabled={isPending}
              />
            </div>

            {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}

            {/* Preview grid with captions */}
            {pendingFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {pendingFiles.map((pf, i) => (
                  <div key={pf.preview} className="relative space-y-2">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pf.preview} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        disabled={isPending}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 text-xs"
                        aria-label="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={pf.caption}
                      onChange={e => updateCaption(i, e.target.value)}
                      placeholder="Caption (optional)"
                      maxLength={200}
                      disabled={isPending}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-amber focus:outline-none disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          {/* Upload progress */}
          {isPending && pendingFiles.length > 0 && (
            <p className="text-sm text-gray-500">
              Uploading {uploadedCount} of {pendingFiles.length} image{pendingFiles.length !== 1 ? 's' : ''}…
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(false) }}
              disabled={isPending}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="flex-1 rounded-lg bg-brand-amber px-4 py-2.5 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Saving…' : 'Save featured job'}
            </button>
          </div>
        </form>
      )}

      {/* Existing featured jobs */}
      {jobs.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">No featured jobs yet. Add one to showcase your work on your public profile.</p>
        </div>
      )}

      {jobs.map(job => (
        <div key={job.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-brand-navy">{job.title}</h3>
              {job.job_id && (
                <span className="mt-1 inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Linked to verified job
                </span>
              )}
            </div>
            <button
              onClick={() => handleDeleteJob(job.id)}
              disabled={isPending}
              className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
            >
              Delete
            </button>
          </div>

          {job.images.length === 0 ? (
            <p className="text-xs text-gray-400">No images yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {job.images.map(img => (
                <div key={img.id} className="space-y-1">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl(supabaseUrl, img.storage_path)}
                      alt={img.caption ?? ''}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => handleDeleteImage(job.id, img.id)}
                      disabled={isPending}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 text-[10px]"
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                  <span className={`inline-flex w-full items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[img.moderation_status] ?? ''}`}>
                    {STATUS_LABELS[img.moderation_status] ?? img.moderation_status}
                  </span>
                  {img.caption && <p className="text-[11px] text-gray-400 leading-tight">{img.caption}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
