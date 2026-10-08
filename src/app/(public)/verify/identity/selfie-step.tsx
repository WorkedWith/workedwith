'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitSelfie, sendSelfieLink } from '@/actions/submit-selfie'

export function SelfieStep() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [onPhone, setOnPhone] = useState<boolean | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkSent, setLinkSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const touch = navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches
    const mobileUa = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)
    setOnPhone(touch || mobileUa)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setError(null)
    if (!file) { setHasPhoto(false); setPreview(null); return }
    setHasPhoto(true)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) { setError('Please take your selfie first.'); return }
    if (!consent) { setError('Please tick the box to agree.'); return }
    const formData = new FormData()
    formData.set('file', file)
    formData.set('consent', 'yes')
    formData.set('touch', '1')
    setError(null)
    startTransition(async () => {
      const res = await submitSelfie(formData)
      if (res.success) router.refresh()
      else setError(res.error)
    })
  }

  function emailLink() {
    setError(null)
    startTransition(async () => {
      const res = await sendSelfieLink()
      if (res.success) setLinkSent(true)
      else setError(res.error)
    })
  }

  if (onPhone === null) return null

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">✓</span>
        Step 1 done. We have your ID document.
      </div>

      <div>
        <h2 className="text-lg font-bold text-brand-navy">Step 2: take a selfie on your phone</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          This shows it is really you holding the ID. The selfie has to be taken now, on a phone. You cannot upload one from a computer.
        </p>
      </div>

      {!onPhone ? (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Open this page on your phone</p>
          <p className="text-sm leading-relaxed text-amber-800">
            Sign in on your phone and go to workedwith.co.uk/verify/identity. Or we can email you a link to open there.
          </p>
          {linkSent ? (
            <p className="text-sm font-medium text-green-700">Sent. Check your email on your phone.</p>
          ) : (
            <button
              type="button"
              onClick={emailLink}
              disabled={isPending}
              className="min-h-[44px] w-full rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50"
            >
              {isPending ? 'Sending...' : 'Email me the link'}
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            Face the camera in good light, with nothing covering your face. No glasses or hat if you can.
          </p>

          <label
            htmlFor="selfie-file"
            className="flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your selfie" className="max-h-56 rounded-lg object-contain" />
            ) : null}
            <span className="text-sm font-semibold text-brand-navy">{hasPhoto ? 'Retake selfie' : 'Take selfie'}</span>
          </label>
          <input
            ref={inputRef}
            id="selfie-file"
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleChange}
            className="sr-only"
          />

          <label className="flex items-start gap-3 text-sm leading-relaxed text-gray-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            I agree WorkedWith can use this selfie only to check my ID against my face. A team member looks at it once, then it is deleted.
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending || !hasPhoto || !consent}
            className="min-h-[44px] w-full rounded-lg bg-brand-amber py-3 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Sending...' : 'Send for review'}
          </button>
        </form>
      )}
    </div>
  )
}
