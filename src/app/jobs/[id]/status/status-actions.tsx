'use client'

import { useState, useTransition } from 'react'
import { endJobEarly, objectToEndedEarly, clientSaysJobFinished, jobStillGoing } from '@/actions/ended-early'
import { NOTE_MAX } from '@/lib/ended-early'

type Props = {
  mode: 'active' | 'ended'
  jobId: string
  role: 'trade' | 'client'
  otherName: string
  canEnd: boolean
  canObject?: boolean
}

export function StatusActions({ mode, jobId, role, otherName, canEnd, canObject }: Props) {
  const [pending, start] = useTransition()
  const [sheet, setSheet] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function run(fn: () => Promise<{ success: true } | { success: false; error: string }>, then: () => void) {
    setError(null)
    start(async () => {
      const r = await fn()
      if (r.success) then()
      else setError(r.error)
    })
  }

  const btn = 'min-h-[48px] w-full rounded-xl px-5 text-sm font-semibold disabled:opacity-50'

  return (
    <div className="space-y-3 pt-2">
      {message && <p className="rounded-lg bg-green-50 p-3 text-green-800">{message}</p>}

      {mode === 'active' && !sheet && (
        <>
          {role === 'trade' ? (
            <a href={`/jobs/${jobId}`} className={`${btn} inline-flex items-center justify-center bg-brand-navy text-white`}>It&apos;s finished, mark it complete</a>
          ) : (
            <button type="button" disabled={pending} className={`${btn} bg-brand-navy text-white`}
              onClick={() => run(() => clientSaysJobFinished(jobId), () => setMessage(`We have let ${otherName} know. They mark the job complete, then you can both review.`))}>
              It&apos;s finished
            </button>
          )}
          <button type="button" disabled={pending || !canEnd} className={`${btn} border border-gray-300 text-gray-700`} onClick={() => setSheet(true)}>
            This job ended early
          </button>
          <button type="button" disabled={pending} className={`${btn} border border-gray-300 text-gray-700`}
            onClick={() => run(() => jobStillGoing(jobId), () => setMessage('Thanks. We will ask again in 90 days.'))}>
            It&apos;s still going
          </button>
        </>
      )}

      {mode === 'active' && sheet && (
        <div className="space-y-3">
          <p>
            Mark this job as ended early? You and {otherName} can then both leave a review. The job will show as ended early on both your profiles, without saying who ended it.
          </p>
          <label className="block font-medium text-gray-700">
            Anything we should know? Only WorkedWith sees this.
            <textarea value={note} onChange={e => setNote(e.target.value.slice(0, NOTE_MAX))} rows={3} maxLength={NOTE_MAX}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber" />
            <span className="block text-right text-xs font-normal text-gray-400">{note.length}/{NOTE_MAX}</span>
          </label>
          <button type="button" disabled={pending} className={`${btn} bg-brand-amber text-brand-navy`}
            onClick={() => run(() => endJobEarly(jobId, note), () => { window.location.href = `/jobs/${jobId}/review` })}>
            {pending ? 'Saving…' : 'Mark as ended early'}
          </button>
          <button type="button" className="text-sm font-medium text-gray-500 underline" onClick={() => setSheet(false)}>Go back</button>
        </div>
      )}

      {mode === 'ended' && (
        <>
          <a href={`/jobs/${jobId}/review`} className={`${btn} inline-flex items-center justify-center bg-brand-amber text-brand-navy`}>Leave your review</a>
          {canObject && (
            <button type="button" disabled={pending} className={`${btn} border border-gray-300 text-gray-700`}
              onClick={() => run(() => objectToEndedEarly(jobId), () => setMessage('Thanks. It now shows as "Outcome disputed" and your reviews stay open.'))}>
              This job was finished
            </button>
          )}
        </>
      )}

      {error && <p className="text-red-600" role="alert">{error}</p>}
    </div>
  )
}
