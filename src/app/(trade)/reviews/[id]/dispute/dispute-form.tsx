'use client'

import { useState, useTransition } from 'react'
import { raiseDispute } from '@/actions/raise-dispute'
import type { DisputeReason } from '@/types/database'

const REASONS: { value: DisputeReason; label: string }[] = [
  { value: 'job_did_not_happen', label: 'Job did not happen'   },
  { value: 'factually_incorrect', label: 'Factually incorrect'  },
  { value: 'defamatory',          label: 'Defamatory'           },
  { value: 'wrong_person',        label: 'Wrong person'         },
  { value: 'other',               label: 'Other'                },
]

type Props = {
  reviewId: string
  reviewJobId: string
}

export function DisputeForm({ reviewId, reviewJobId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState<DisputeReason | ''>('')
  const [details, setDetails] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'reason' | 'details', string>>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})

    if (!reason) {
      setFieldErrors({ reason: 'Please select a reason.' })
      return
    }

    startTransition(async () => {
      const result = await raiseDispute(reviewId, reason as DisputeReason, details)
      if (result.success) {
        setSubmitted(true)
      } else {
        if (result.field) setFieldErrors({ [result.field]: result.error })
        else setGlobalError(result.error)
      }
    })
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-7 w-7 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-brand-navy">Dispute raised</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          The reviewer has been notified and has 7 days to submit their evidence. WorkedWith admin will review both sides and reach a decision within 21 days.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          The review remains visible and is labelled &apos;Under dispute&apos; in the meantime.
        </p>
        <a
          href={`/jobs/${reviewJobId}`}
          className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
        >
          Back to job
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-brand-navy mb-1">Raise a dispute</h2>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        Your dispute will be reviewed by WorkedWith admin within 21 days. The review remains visible but is labelled &apos;Under dispute&apos; during this time.
      </p>

      {/* Alternative: respond to review */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-900">Consider responding instead</p>
        <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
          Disputes take up to 21 days. A public response lets you address the review immediately and shows potential clients your professionalism.
        </p>
        <a
          href={`/reviews/${reviewId}/respond`}
          className="mt-2 inline-block text-xs font-semibold text-amber-800 underline hover:no-underline"
        >
          Respond to this review instead →
        </a>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason <span className="text-red-500">*</span>
          </label>
          <select
            value={reason}
            onChange={e => { setReason(e.target.value as DisputeReason | ''); setFieldErrors(p => ({ ...p, reason: undefined })) }}
            disabled={isPending}
            className={selectCls(!!fieldErrors.reason)}
          >
            <option value="">Select a reason…</option>
            {REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {fieldErrors.reason && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.reason}</p>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Details <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-gray-400">{details.length}/1000</span>
          </div>
          <textarea
            value={details}
            onChange={e => { setDetails(e.target.value); setFieldErrors(p => ({ ...p, details: undefined })) }}
            disabled={isPending}
            rows={5}
            maxLength={1000}
            placeholder="Explain why you are disputing this review. Include any relevant facts, dates, or context…"
            className={`${inputCls(!!fieldErrors.details)} resize-none`}
          />
          {fieldErrors.details && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.details}</p>
          )}
        </div>

        {globalError && (
          <p role="alert" className="text-sm text-red-600">{globalError}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-brand-navy px-4 py-3 text-base font-semibold text-white
            transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Submitting dispute…' : 'Submit dispute'}
        </button>
      </form>
    </div>
  )
}

function inputCls(hasErr: boolean) {
  return `w-full rounded-lg border px-4 py-3 text-base
    focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50
    ${hasErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-brand-amber'}`
}

function selectCls(hasErr: boolean) {
  return `w-full rounded-lg border bg-white px-4 py-3 text-base
    focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50
    ${hasErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-brand-amber'}`
}
