'use client'

import { useState, useTransition } from 'react'
import { TradePicker } from '@/components/trade-picker'
import { approveClientListing, rejectClientListing, mergeClientListing } from '@/actions/admin/client-listings'

export function ListingReview({ id, name: n0, trade: t0, district: d0 }: { id: string; name: string; trade: string; district: string }) {
  const [name, setName] = useState(n0)
  const [trade, setTrade] = useState(t0)
  const [extra, setExtra] = useState('')
  const [areas, setAreas] = useState(d0)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [slug, setSlug] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const input = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'

  function run(fn: () => Promise<{ success: true } | { success: false; error: string }>, label: string) {
    setError(null)
    start(async () => {
      const r = await fn()
      if (r.success) setDone(label)
      else setError(r.error)
    })
  }

  if (done) return <p className="mt-4 text-sm font-medium text-green-700">{done}</p>

  return (
    <div className="mt-3 space-y-3">
      <label className="block text-xs font-medium text-gray-600">Business name
        <input value={name} onChange={e => setName(e.target.value)} className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="text-xs font-medium text-gray-600">Main trade
          <div className="mt-1"><TradePicker value={trade} onChange={setTrade} placeholder="Choose a trade" /></div>
        </div>
        <label className="block text-xs font-medium text-gray-600">Another trade (optional)
          <input value={extra} onChange={e => setExtra(e.target.value)} placeholder="e.g. Tiling" className={input} />
        </label>
      </div>
      <label className="block text-xs font-medium text-gray-600">Areas served (postcode districts, comma separated)
        <input value={areas} onChange={e => setAreas(e.target.value)} className={input} />
      </label>
      <label className="block text-xs font-medium text-gray-600">Public email (only if genuinely public, optional)
        <input value={email} onChange={e => setEmail(e.target.value)} className={input} />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending}
          onClick={() => run(() => approveClientListing({
            submissionId: id, business_name: name,
            trade_categories: [trade, ...extra.split(',').map(s => s.trim()).filter(Boolean)].filter(Boolean),
            operating_areas: areas.split(',').map(s => s.trim()).filter(Boolean),
            public_email: email,
          }), 'Approved, the listing is live')}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">Approve</button>
      </div>

      <div className="grid gap-2 border-t border-gray-100 pt-3 sm:grid-cols-2">
        <div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Private note (optional)" className={input} />
          <button type="button" disabled={pending} onClick={() => run(() => rejectClientListing(id, note), 'Rejected')}
            className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Reject</button>
        </div>
        <div>
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Existing listing address, e.g. smith-plumbing" className={input} />
          <button type="button" disabled={pending} onClick={() => run(() => mergeClientListing(id, slug), 'Merged into the existing listing')}
            className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Merge</button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
