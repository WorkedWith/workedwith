'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TRADE_TYPES } from '@/lib/trade-types'
import { createSeededProfile } from '@/actions/admin/create-seeded-profile'

const UK_DISTRICT_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/i

export function AddSeededProfileForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [tradeCategory, setTradeCategory] = useState('')
  const [areasRaw, setAreasRaw] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [sourceNote, setSourceNote] = useState('')

  function parseAreas(raw: string): string[] {
    return raw
      .split(/[\s,]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => UK_DISTRICT_RE.test(s))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const areas = parseAreas(areasRaw)
    if (areas.length === 0) {
      setError('Enter at least one valid UK outward code, e.g. SW1, M1.')
      return
    }

    startTransition(async () => {
      const result = await createSeededProfile({
        business_name: businessName,
        trade_category: tradeCategory,
        operating_areas: areas,
        contact_phone: phone.trim() || null,
        contact_email: email.trim() || null,
        source_note: sourceNote.trim() || null,
      })

      if (result.success) {
        setSuccess(`Created: /t/${result.profile.slug}`)
        setBusinessName('')
        setTradeCategory('')
        setAreasRaw('')
        setPhone('')
        setEmail('')
        setSourceNote('')
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Business name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="Smith Plumbing Ltd"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Trade category <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={tradeCategory}
            onChange={e => setTradeCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          >
            <option value="" disabled>Select trade</option>
            {TRADE_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Operating areas <span className="text-red-500">*</span>
          <span className="ml-1 font-normal text-gray-400">(outward codes, space or comma separated)</span>
        </label>
        <input
          type="text"
          required
          value={areasRaw}
          onChange={e => setAreasRaw(e.target.value)}
          placeholder="SW1 SW2 SW3"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
        />
        {areasRaw.trim() && (
          <p className="mt-1 text-xs text-gray-400">
            Parsed: {parseAreas(areasRaw).join(', ') || 'no valid codes yet'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone <span className="font-normal text-gray-400">(optional, for outreach)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+44 7700 900000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email <span className="font-normal text-gray-400">(optional, for outreach)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="hello@example.co.uk"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Source note <span className="font-normal text-gray-400">(optional, internal only)</span>
        </label>
        <input
          type="text"
          value={sourceNote}
          onChange={e => setSourceNote(e.target.value)}
          placeholder="Yell.com listing, retrieved 2026-10-06"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Adding…' : 'Add listing'}
      </button>
    </form>
  )
}
