'use client'

import { useState, useTransition } from 'react'
import { createShareLink, revokeShareLink } from '@/actions/share-links'
import { SHARE_DURATIONS, DEFAULT_SHARE_DAYS, shareProfileMessage } from '@/lib/share-links'

type Link = { id: string; url: string; expiresAt: string; opens: number; tradeViews: number }

export function ShareProfileCard({ links: initial }: { links: Link[] }) {
  const [links, setLinks] = useState(initial)
  const [days, setDays] = useState<number>(DEFAULT_SHARE_DAYS)
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string | null>(null)

  function create() {
    setNote(null)
    start(async () => {
      const r = await createShareLink(days)
      if (!r.success) { setNote(r.error); return }
      window.location.reload()
    })
  }
  function revoke(id: string) {
    setNote(null)
    start(async () => {
      const r = await revokeShareLink(id)
      if (r.success) setLinks(links.filter(l => l.id !== id))
      else setNote(r.error)
    })
  }
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setNote(`${what} copied.`) } catch { setNote('Could not copy. Select the text and copy it yourself.') }
  }

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-brand-navy">Share my WorkedWith profile</h2>
      <p className="mt-1 text-sm text-gray-600">
        Share your profile with trades you&apos;re asking for quotes. You choose how long the link works and can switch it off any time.
      </p>
      <p className="mt-1 text-xs text-gray-400">Getting quotes? Send trades your profile link so they know you&apos;re a good client.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-700" htmlFor="share-days">Lasts for</label>
        <select id="share-days" value={days} onChange={e => setDays(Number(e.target.value))} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
          {SHARE_DURATIONS.map(d => <option key={d} value={d}>{d} days</option>)}
        </select>
        <button type="button" onClick={create} disabled={pending}
          className="min-h-[40px] rounded-lg bg-brand-navy px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
          Make a link
        </button>
      </div>

      {links.length > 0 && (
        <ul className="mt-4 space-y-3">
          {links.map(l => (
            <li key={l.id} className="rounded-lg bg-gray-50 p-3">
              <p className="truncate text-sm text-gray-700">{l.url}</p>
              <p className="mt-1 text-xs text-gray-500">
                Works until {new Date(l.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · opened {l.opens} time{l.opens === 1 ? '' : 's'}, {l.tradeViews} by signed in trades
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(l.url, 'Link')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white">Copy link</button>
                <button type="button" onClick={() => copy(shareProfileMessage(l.url), 'Message')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white">Copy message</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareProfileMessage(l.url))}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white">WhatsApp</a>
                <a href={`sms:?&body=${encodeURIComponent(shareProfileMessage(l.url))}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white">Text</a>
                <button type="button" onClick={() => revoke(l.id)} disabled={pending} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Switch off</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-3 text-xs text-gray-500" role="status">{note}</p>}
    </section>
  )
}
