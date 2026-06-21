'use client'

import { useRef, useState, useTransition } from 'react'
import { submitIdVerification } from '@/actions/submit-id-verification'

export function IdentityUploadForm() {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) { setError('Please select a file to upload.'); return }

    const formData = new FormData()
    formData.set('file', file)

    setError(null)
    startTransition(async () => {
      const result = await submitIdVerification(formData)
      if (result.success) {
        setDone(true)
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-semibold text-amber-900">Your ID is under review</p>
        <p className="mt-1 text-sm text-amber-700 leading-relaxed">
          We will notify you within 1 to 2 working days. You can close this page.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-bold text-brand-navy">Verify your identity</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Upload a photo of your UK driving licence. Your image is reviewed by a WorkedWith team member and deleted immediately after review. Only a secure hash of your licence number is retained.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File input */}
        <div>
          <label
            htmlFor="id-file"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center cursor-pointer hover:border-brand-amber hover:bg-amber-50 transition-colors"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Document preview" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            )}
            <span className="text-sm font-medium text-gray-600">
              {fileName ?? 'Click to select file'}
            </span>
            <span className="text-xs text-gray-400">JPG, PNG, WebP, or PDF — max 10 MB</span>
          </label>
          <input
            ref={inputRef}
            id="id-file"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending || !fileName}
          className="w-full rounded-lg bg-brand-amber py-3 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Uploading…' : 'Submit for review'}
        </button>
      </form>
    </div>
  )
}
