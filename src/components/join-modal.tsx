'use client'

import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export function JoinModal({ open, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <XIcon />
        </button>

        <h2 className="text-xl font-bold text-brand-navy mb-1">Join WorkedWith</h2>
        <p className="text-sm text-gray-500 mb-6">Choose how you&apos;d like to get started.</p>

        <div className="grid grid-cols-2 gap-4">
          <a
            href="/join/trade"
            className="flex flex-col items-center gap-3 rounded-xl bg-brand-navy p-6 text-center text-white hover:bg-brand-navy/90 transition-colors"
          >
            <span className="text-4xl" aria-hidden>🔨</span>
            <span className="text-sm font-semibold leading-snug">I&apos;m a<br />tradesperson</span>
          </a>
          <a
            href="/join/client/individual"
            className="flex flex-col items-center gap-3 rounded-xl bg-brand-amber p-6 text-center text-brand-navy hover:bg-amber-400 transition-colors"
          >
            <span className="text-4xl" aria-hidden>🏠</span>
            <span className="text-sm font-semibold leading-snug">I&apos;m a<br />client</span>
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <a href="/sign-in" className="font-medium text-brand-amber hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}
