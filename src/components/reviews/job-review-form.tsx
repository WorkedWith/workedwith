'use client'

import { useState, useTransition } from 'react'
import { submitJobReview, type JobReviewInput } from '@/actions/job-reviews'
import { PhotoPicker } from '@/components/quotes/photo-picker'
import { Button, ErrorText, Select, TextArea } from '@/components/ui'
import type { RedFlagReason } from '@/types/database'

function Stars({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-gray-800">{label}</span>
      <span className="flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} out of 5`} onClick={() => onChange(n)}
            className={`flex h-11 w-11 items-center justify-center text-2xl ${n <= value ? 'text-brand-amber' : 'text-gray-300'}`}>★</button>
        ))}
      </span>
    </div>
  )
}

const FLAGS: { v: RedFlagReason; l: string }[] = [
  { v: 'non_payment', l: 'Did not pay' },
  { v: 'aggressive_behaviour', l: 'Aggressive behaviour' },
  { v: 'refused_access', l: 'Refused access' },
  { v: 'false_dispute', l: 'False dispute' },
  { v: 'unsafe_site', l: 'Unsafe site' },
  { v: 'other', l: 'Other' },
]

/** One form for both sides; the dimensions follow the existing review system. */
export function JobReviewForm({ jobId, role, initial, initialPhotos }: { jobId: string; role: 'trade' | 'client'; initial: Partial<JobReviewInput> | null; initialPhotos: Record<string, string> }) {
  const [v, setV] = useState<JobReviewInput>({ jobId, overall: 0, text: '', photoPaths: [], ...initial })
  const [pv, setPv] = useState<Record<string, string>>(initialPhotos)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const set = (p: Partial<JobReviewInput>) => setV(prev => ({ ...prev, ...p }))
  return (
    <div className="space-y-3">
      <Stars label="Overall" value={v.overall} onChange={n => set({ overall: n })} />
      {role === 'client' ? (
        <>
          <Stars label="Quality of work" value={v.quality ?? 0} onChange={n => set({ quality: n })} />
          <Stars label="Reliability" value={v.reliability ?? 0} onChange={n => set({ reliability: n })} />
          <Stars label="Value" value={v.value ?? 0} onChange={n => set({ value: n })} />
        </>
      ) : (
        <>
          <Stars label="Paying" value={v.payment ?? 0} onChange={n => set({ payment: n })} />
          <Stars label="Clear about the job" value={v.scopeClarity ?? 0} onChange={n => set({ scopeClarity: n })} />
          <Stars label="Site access" value={v.siteAccess ?? 0} onChange={n => set({ siteAccess: n })} />
        </>
      )}
      <Stars label="Communication" value={v.communication ?? 0} onChange={n => set({ communication: n })} />
      <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={!!v.wouldWorkAgain} onChange={e => set({ wouldWorkAgain: e.target.checked })} />I would work with them again</label>
      {role === 'trade' && (
        <div className="space-y-2">
          <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={!!v.redFlag} onChange={e => set({ redFlag: e.target.checked })} />Raise a red flag about this client</label>
          {v.redFlag && (
            <Select aria-label="Red flag reason" value={v.redFlagReason ?? ''} onChange={e => set({ redFlagReason: (e.target.value || null) as RedFlagReason | null })}>
              <option value="">Pick a reason</option>
              {FLAGS.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
            </Select>
          )}
        </div>
      )}
      <TextArea rows={4} maxLength={500} aria-label="Your review" placeholder="What was it like?" value={v.text} onChange={e => set({ text: e.target.value })} />
      <p className="text-xs text-gray-500">{v.text.length} of 500. Up to 5 photos. Never show anyone’s address.</p>
      <PhotoPicker folder="reviews" paths={v.photoPaths} previews={pv} max={5} onChange={(p, x) => { setPv(x); set({ photoPaths: p }) }} label="Add photos" />
      <Button type="button" full disabled={pending} onClick={() => start(async () => {
        setError(null)
        const r = await submitJobReview(v)
        if (r.ok) window.location.reload()
        else setError(r.error)
      })}>{pending ? 'Saving…' : initial ? 'Save changes' : 'Submit review'}</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
