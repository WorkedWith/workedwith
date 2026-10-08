'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitIdVerification } from '@/actions/submit-id-verification'

export function IdentityUploadForm() {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<'driving_licence' | 'passport'>('driving_licence')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()
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
    formData.set('document_type', documentType)

    setError(null)
    startTransition(async () => {
      const result = await submitIdVerification(formData)
      if (result.success) {
        setDone(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-semibold text-amber-900">Document received</p>
        <p className="mt-1 text-sm text-amber-700 leading-relaxed">
          One more step: the selfie.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-bold text-brand-navy">Verify your identity</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Send a photo of a driving licence or a passport. Any passport works, you do not need a UK licence. This is step 1 of 2. Step 2 is a quick selfie, taken on your phone, so we can check the ID is yours. A WorkedWith team member checks both, usually within 1 to 2 working days, then deletes the images. We never keep the document number, only a scrambled version so the same document cannot be used on two accounts. Clients never see your document or selfie.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Which document are you sending?</legend>
          <div className="grid grid-cols-2 gap-2">
            {([['driving_licence', 'Driving licence'], ['passport', 'Passport']] as const).map(([value, label]) => (
              <label
                key={value}
                className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-sm font-semibold transition-colors ${
                  documentType === value ? 'border-brand-navy bg-brand-navy text-white' : 'border-gray-200 text-gray-700 hover:border-brand-navy'
                }`}
              >
                <input
                  type="radio"
                  name="document_type"
                  value={value}
                  checked={documentType === value}
                  onChange={() => setDocumentType(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
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
            <span className="text-xs text-gray-400">JPG, PNG, WebP, or PDF, max 10 MB</span>
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
          {isPending ? 'Uploading…' : 'Continue to selfie'}
        </button>
      </form>
    </div>
  )
}
