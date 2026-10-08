'use client'

import { useState } from 'react'

const MESSAGE =
  'Hi, I have logged our job on WorkedWith, which keeps a record of jobs and reviews for both of us. ' +
  'You will get a message from WorkedWith asking you to confirm it. It takes a minute and it is free.'

/** A ready-made note a tradesperson can send their client, by any app they like. */
export function InviteMessage() {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(MESSAGE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  async function share() {
    try {
      await navigator.share({ text: MESSAGE })
    } catch {
      // Cancelled by the user, nothing to do
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
      <p className="text-sm font-semibold text-brand-navy">Give your client a heads up</p>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        Clients are more likely to confirm when they know it is coming. Send them this by text, WhatsApp or email.
      </p>
      <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-relaxed text-gray-700">{MESSAGE}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={copy}
          className="min-h-[44px] flex-1 rounded-xl bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
        >
          {copied ? 'Copied' : 'Copy message'}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="min-h-[44px] flex-1 rounded-xl border-2 border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-white transition-colors"
          >
            Share
          </button>
        )}
      </div>
    </div>
  )
}
