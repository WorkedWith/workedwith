'use client'

import { useState } from 'react'

export function UsernameCard({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(username)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the username is still on screen to read out
    }
  }

  return (
    <section className="rounded-xl border border-brand-amber/50 bg-amber-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">Your WorkedWith username</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-2xl font-bold text-brand-navy">{username}</p>
        <button
          type="button"
          onClick={copy}
          className="min-h-[44px] shrink-0 rounded-lg border-2 border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-sm text-amber-900 leading-relaxed">
        Give this to any tradesperson you hire. They use it to find your profile and confirm who they are working
        with. You can change it any time in <a href="/profile" className="font-semibold underline">your profile</a>.
      </p>
    </section>
  )
}
