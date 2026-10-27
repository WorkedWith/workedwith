'use client'

import { useState } from 'react'
import { submitInsurance } from '@/actions/insurance'
import { COVER_OPTIONS, MAX_INSURANCE_FILE_BYTES } from '@/lib/insurance'

export function InsuranceForm() {
  const [insurer, setInsurer] = useState('')
  const [cover, setCover] = useState<string>(String(COVER_OPTIONS[0].value))
  const [other, setOther] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!file) { setError('Add your certificate as a PDF or photo.'); return }
    if (file.size > MAX_INSURANCE_FILE_BYTES) { setError('The file must be 4 MB or smaller.'); return }
    const amount = cover === 'other' ? Number(other.replace(/[^\d]/g, '')) : Number(cover)
    const fd = new FormData()
    fd.set('insurer', insurer)
    fd.set('cover', String(amount))
    fd.set('expiresOn', expiresOn)
    fd.set('file', file)
    setBusy(true)
    try {
      const r = await submitInsurance(fd)
      if (!r.success) { setError(r.error); return }
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  const input = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber'

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Insurer
        <input value={insurer} onChange={e => setInsurer(e.target.value)} maxLength={80} className={input} />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Cover amount
        <select value={cover} onChange={e => setCover(e.target.value)} className={input}>
          {COVER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          <option value="other">Other</option>
        </select>
      </label>
      {cover === 'other' && (
        <label className="block text-sm font-medium text-gray-700">
          Amount in pounds
          <input inputMode="numeric" value={other} onChange={e => setOther(e.target.value)} placeholder="500000" className={input} />
        </label>
      )}
      <label className="block text-sm font-medium text-gray-700">
        Runs out on
        <input type="date" value={expiresOn} onChange={e => setExpiresOn(e.target.value)} className={input} />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Certificate (PDF or photo, 4 MB or smaller)
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
      </label>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={busy}
        className="min-h-[48px] w-full rounded-xl bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50">
        {busy ? 'Uploading…' : 'Send for checking'}
      </button>
    </form>
  )
}
