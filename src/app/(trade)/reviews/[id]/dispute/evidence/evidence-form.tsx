'use client'

import { useState, useTransition } from 'react'
import { submitDisputeEvidence } from '@/actions/submit-dispute-evidence'

type Props = {
  disputeId: string
  disputeReason: string
  disputeDetails: string
  evidenceDeadline: string
}

export function EvidenceForm({ disputeId, disputeReason, disputeDetails, evidenceDeadline }: Props) {
  const [isPending, startTransition] = useTransition()
  const [evidence, setEvidence] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    setFieldError(null)

    startTransition(async () => {
      const result = await submitDisputeEvidence(disputeId, evidence)
      if (result.success) {
        setSubmitted(true)
      } else {
        if (result.field === 'evidence') setFieldError(result.error)
        else setGlobalError(result.error)
      }
    })
  }

  const deadlineFmt = new Date(evidenceDeadline).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const deadlinePassed = new Date(evidenceDeadline) < new Date()

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-brand-navy">Evidence submitted</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          WorkedWith admin will review both sides and reach a decision within 14 days.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
        >
          Back to dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Dispute summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <h2 className="text-base font-semibold text-brand-navy mb-3">Dispute details</h2>
        <dl className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reason</dt>
            <dd className="col-span-2 text-sm text-gray-700">{disputeReason}</dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Details</dt>
            <dd className="col-span-2 text-sm text-gray-700 leading-relaxed">{disputeDetails}</dd>
          </div>
        </dl>
      </div>

      {/* Deadline */}
      <div className={`rounded-xl border px-4 py-3 ${
        deadlinePassed
          ? 'border-red-200 bg-red-50'
          : 'border-amber-200 bg-amber-50'
      }`}>
        <p className={`text-sm font-semibold ${deadlinePassed ? 'text-red-800' : 'text-amber-900'}`}>
          {deadlinePassed ? 'Deadline passed' : 'Evidence deadline'}
        </p>
        <p className={`mt-0.5 text-sm ${deadlinePassed ? 'text-red-700' : 'text-amber-700'}`}>
          {deadlinePassed
            ? `The evidence window closed on ${deadlineFmt}.`
            : `You must submit your evidence by ${deadlineFmt}.`}
        </p>
      </div>

      {!deadlinePassed && (
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-brand-navy mb-1">Your evidence</h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Provide any factual information, dates, or context that supports your position. Keep it factual and professional.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Evidence <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400">{evidence.length}/1000</span>
              </div>
              <textarea
                value={evidence}
                onChange={e => { setEvidence(e.target.value); setFieldError(null) }}
                disabled={isPending}
                rows={6}
                maxLength={1000}
                placeholder="Describe the job, what happened, and why the review is inaccurate or unfair. Include dates, communications, or any other relevant facts…"
                className={`w-full rounded-lg border px-4 py-3 text-base resize-none
                  focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50
                  ${fieldError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-brand-amber'}`}
              />
              {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
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
              {isPending ? 'Submitting evidence…' : 'Submit evidence'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
