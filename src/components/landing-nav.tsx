'use client'

import { useState } from 'react'
import { JoinModal } from './join-modal'

export function LandingNav() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight text-brand-navy">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#how-it-works"
              className="hidden sm:flex min-h-[44px] items-center px-3 text-sm font-medium text-gray-600 hover:text-brand-navy transition-colors"
            >
              How it works
            </a>
            <a
              href="/sign-in"
              className="hidden sm:flex min-h-[44px] items-center px-3 text-sm font-medium text-gray-600 hover:text-brand-navy transition-colors"
            >
              Sign in
            </a>
            <button
              onClick={() => setModalOpen(true)}
              className="min-h-[44px] flex items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Join
            </button>
          </div>
        </div>
      </nav>
      <JoinModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
