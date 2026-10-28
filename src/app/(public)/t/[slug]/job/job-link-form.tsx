'use client'

import { useRef, useState } from 'react'
import { requestViaJobLink } from '@/actions/request-via-job-link'

type Props = {
  slug: string
  businessName: string
  jobTypes: string[]
  initial: { state: 'finished' | 'in_progress' | null; type: string; district: string; month: string }
}

export function JobLinkForm({ slug, businessName, jobTypes, initial }: Props) {
  const [state, setState] = useState<'finished' | 'in_progress' | null>(initial.state)
  const [type, setType] = useState(initial.type)
  const [district, setDistrict] = useState(initial.district)
  const [month, setMonth] = useState(initial.month)
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const shownAt = useRef(Date.now())

  const thisMonth = new Date().toISOString().slice(0, 7)
  const input = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!state) { setError('Choose whether the job is finished.'); return }
    if (!type) { setError('Choose the kind of job.'); return }
    setBusy(true)
    try {
      const r = await requestViaJobLink({
        slug, jobState: state, jobType: type, district, month, website, elapsedMs: Date.now() - shownAt.current,
      })
      if (r.success) { setDone(true); return }
      if (r.needsSignIn) {
        const back = `/t/${slug}/job?${new URLSearchParams({ state, type, district, month }).toString()}`
        window.location.href = `/sign-in?next=${encodeURIComponent(back)}`
        return
      }
      setError(r.error)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-lg font-bold text-brand-navy">Sent to {businessName}</p>
        <p className="text-sm text-gray-600">Once they confirm, you can both leave a review. We will let you know.</p>
        <a href="/dashboard" className="mt-2 inline-block text-sm font-semibold text-brand-navy underline">Go to your dashboard</a>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {([['finished', 'The job is finished'], ['in_progress', 'The job is still going']] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setState(v)}
            className={`min-h-[56px] rounded-xl border px-3 text-sm font-semibold ${state === v ? 'border-brand-navy bg-brand-navy text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      <label className="block text-sm font-medium text-gray-700">
        What did they do?
        <select value={type} onChange={e => setType(e.target.value)} className={input}>
          <option value="">Choose one</option>
          {jobTypes.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </label>

      <label className="block text-sm font-medium text-gray-700">
        First part of the postcode
        <input value={district} onChange={e => setDistrict(e.target.value.toUpperCase().slice(0, 4))} placeholder="M20" className={input} />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        {state === 'in_progress' ? 'Which month did it start?' : 'Roughly which month was it?'}
        <input type="month" value={month} max={thisMonth} onChange={e => setMonth(e.target.value)} className={input} />
      </label>

      {/* Hidden from people. Bots tend to fill it in. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <button type="submit" disabled={busy}
        className="min-h-[48px] w-full rounded-xl bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50">
        {busy ? 'Sending…' : 'Log this job'}
      </button>
      <p className="text-center text-xs text-gray-400">You will be asked to sign in or join, and to confirm your phone number.</p>
    </form>
  )
}
