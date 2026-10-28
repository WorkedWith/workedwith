'use client'

import { useState } from 'react'
import { shareProfileMessage } from '@/lib/share-links'

export function ShareProfileCard({ url }: { url: string }) {
  const [note, setNote] = useState<string | null>(null)
  const message = shareProfileMessage(url)
  const btn = 'rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50'

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setNote(`${what} copied.`) } catch { setNote('Could not copy. Select the text and copy it yourself.') }
  }

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-brand-navy">Share my WorkedWith profile</h2>
      <p className="mt-1 text-sm text-gray-600">
        Getting quotes? Send trades your profile link so they know you&apos;re a good client. Only signed in tradespeople can open it, and what they see depends on their plan.
      </p>
      <p className="mt-3 truncate rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => copy(url, 'Link')} className={btn}>Copy link</button>
        <button type="button" onClick={() => copy(message, 'Message')} className={btn}>Copy message</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={btn}>WhatsApp</a>
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className={btn}>Text</a>
      </div>
      {note && <p className="mt-3 text-xs text-gray-500" role="status">{note}</p>}
    </section>
  )
}
