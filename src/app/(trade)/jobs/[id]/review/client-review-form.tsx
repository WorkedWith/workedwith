'use client'

import { useState, useTransition } from 'react'
import { submitReview } from '@/actions/submit-review'

type Props = {
  jobId: string
  revieweeName: string
  jobType: string
}

export function ClientReviewForm({ jobId, revieweeName, jobType }: Props) {
  const [isPending, startTransition] = useTransition()
  const [overallRating, setOverallRating] = useState(0)
  const [qualityScore, setQualityScore] = useState(0)
  const [communicationScore, setCommunicationScore] = useState(0)
  const [reliabilityScore, setReliabilityScore] = useState(0)
  const [valueScore, setValueScore] = useState(0)
  const [wouldHireAgain, setWouldHireAgain] = useState<boolean | null>(null)
  const [writtenReview, setWrittenReview] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [result, setResult] = useState<{ bothSubmitted: boolean } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})

    startTransition(async () => {
      const res = await submitReview({
        job_id: jobId,
        overall_rating: overallRating,
        quality_score: qualityScore || undefined,
        communication_score: communicationScore || undefined,
        reliability_score: reliabilityScore || undefined,
        value_score: valueScore || undefined,
        would_work_again: wouldHireAgain ?? undefined,
        written_review: writtenReview || undefined,
      })

      if (res.success) {
        setResult({ bothSubmitted: res.bothSubmitted })
      } else {
        if (res.field) setFieldErrors({ [res.field]: res.error })
        else setGlobalError(res.error)
      }
    })
  }

  if (result) {
    return (
      <SuccessState
        bothSubmitted={result.bothSubmitted}
        revieweeName={revieweeName}
        jobId={jobId}
      />
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-brand-navy mb-1">
        Review: {revieweeName}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {jobType} job · Your review won&apos;t be visible until {revieweeName} submits theirs.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Overall */}
        <RatingField
          label="Overall"
          required
          value={overallRating}
          onChange={setOverallRating}
          disabled={isPending}
          error={fieldErrors.overall_rating}
        />

        <div className="grid grid-cols-2 gap-4">
          <RatingField label="Quality of work" value={qualityScore} onChange={setQualityScore} disabled={isPending} />
          <RatingField label="Communication" value={communicationScore} onChange={setCommunicationScore} disabled={isPending} />
          <RatingField label="Reliability" value={reliabilityScore} onChange={setReliabilityScore} disabled={isPending} />
          <RatingField label="Value for money" value={valueScore} onChange={setValueScore} disabled={isPending} />
        </div>

        {/* Would hire again */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Would hire again?</p>
          <div className="flex gap-3">
            {([true, false] as const).map(val => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setWouldHireAgain(wouldHireAgain === val ? null : val)}
                disabled={isPending}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50
                  ${wouldHireAgain === val
                    ? 'border-brand-navy bg-brand-navy text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        {/* Written review */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700">Written review</label>
            <span className="text-xs text-gray-400">{writtenReview.length}/500</span>
          </div>
          <textarea
            value={writtenReview}
            onChange={e => setWrittenReview(e.target.value)}
            disabled={isPending}
            rows={4}
            maxLength={500}
            placeholder="Optional — describe the quality of work and your experience…"
            className={`${inputCls(!!fieldErrors.written_review)} resize-none`}
          />
          {fieldErrors.written_review && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.written_review}</p>
          )}
        </div>

        {globalError && <p role="alert" className="text-sm text-red-600">{globalError}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy
            transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending
            ? 'Submitting…'
            : `Submit your review — it won't be visible until ${revieweeName} submits theirs`}
        </button>
      </form>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function RatingField({ label, required, value, onChange, disabled, error }: {
  label: string
  required?: boolean
  value: number
  onChange: (v: number) => void
  disabled: boolean
  error?: string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </p>
      <StarRating value={value} onChange={onChange} disabled={disabled} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function StarRating({ value, onChange, disabled }: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? 0 : star)}
          disabled={disabled}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          className={`text-2xl leading-none transition-colors disabled:cursor-not-allowed
            ${star <= value ? 'text-brand-amber' : 'text-gray-300 hover:text-yellow-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function SuccessState({ bothSubmitted, revieweeName, jobId }: {
  bothSubmitted: boolean
  revieweeName: string
  jobId: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
        <svg className="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      </div>
      {bothSubmitted ? (
        <>
          <h2 className="text-xl font-semibold text-brand-navy">Both reviews are live</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Both reviews are now published. Check your email to see what {revieweeName} said.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-brand-navy">Review saved</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Your review is saved. We&apos;ll notify you when{' '}
            <span className="font-medium text-brand-navy">{revieweeName}</span> submits theirs,
            and both will go live together.
          </p>
        </>
      )}
      <a
        href={`/jobs/${jobId}`}
        className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
      >
        Back to job
      </a>
    </div>
  )
}

function inputCls(hasErr: boolean) {
  return `w-full rounded-lg border px-4 py-3 text-base
    focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50
    ${hasErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-brand-amber'}`
}
