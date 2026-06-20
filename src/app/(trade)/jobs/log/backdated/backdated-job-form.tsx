'use client'

import { useState, useTransition } from 'react'
import { TRADE_TYPES } from '@/lib/trade-types'
import { logBackdatedJob } from '@/actions/log-backdated-job'
import type { JobInitiatedBy, RedFlagReason } from '@/types/database'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const RED_FLAG_REASONS: Array<{ value: RedFlagReason; label: string }> = [
  { value: 'aggressive_behaviour', label: 'Aggressive behaviour' },
  { value: 'refused_access',       label: 'Refused access' },
  { value: 'non_payment',          label: 'Non-payment' },
  { value: 'false_dispute',        label: 'False dispute' },
  { value: 'unsafe_site',          label: 'Unsafe site' },
  { value: 'other',                label: 'Other' },
]

type FieldErrors = Partial<Record<
  'job_type' | 'description' | 'postcode' | 'backdated_period' | 'invitee_email' | 'invitee_phone',
  string
>>

export function BackdatedJobForm({ initiatedBy }: { initiatedBy: JobInitiatedBy }) {
  const [isPending, startTransition] = useTransition()

  // Core job fields
  const [jobType, setJobType] = useState('')
  const [description, setDescription] = useState('')
  const [postcode, setPostcode] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [inviteePhone, setInviteePhone] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ jobId: string; inviteeSentTo: string; reviewSaved: boolean } | null>(null)

  // Optional review fields
  const [reviewOpen, setReviewOpen] = useState(false)
  const [overallRating, setOverallRating] = useState(0)
  const [qualityScore, setQualityScore] = useState(0)
  const [reliabilityScore, setReliabilityScore] = useState(0)
  const [valueScore, setValueScore] = useState(0)
  const [paymentScore, setPaymentScore] = useState(0)
  const [scopeClarityScore, setScopeClarityScore] = useState(0)
  const [siteAccessScore, setSiteAccessScore] = useState(0)
  const [communicationScore, setCommunicationScore] = useState(0)
  const [wouldWorkAgain, setWouldWorkAgain] = useState<boolean | null>(null)
  const [writtenReview, setWrittenReview] = useState('')
  const [redFlag, setRedFlag] = useState(false)
  const [redFlagReason, setRedFlagReason] = useState<RedFlagReason | ''>('')
  const [reviewError, setReviewError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const inviteeLabel = initiatedBy === 'trade' ? 'client' : 'tradesperson'

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  function resetReview() {
    setOverallRating(0); setQualityScore(0); setReliabilityScore(0)
    setValueScore(0); setPaymentScore(0); setScopeClarityScore(0)
    setSiteAccessScore(0); setCommunicationScore(0)
    setWouldWorkAgain(null); setWrittenReview('')
    setRedFlag(false); setRedFlagReason(''); setReviewError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})
    setReviewError(null)

    const backdated_period = month && year ? `${MONTHS[parseInt(month) - 1]} ${year}` : ''
    if (!month || !year) {
      setFieldErrors({ backdated_period: 'Please select a month and year.' })
      return
    }

    if (reviewOpen && overallRating === 0) {
      setReviewError('Please select an overall rating.')
      return
    }

    startTransition(async () => {
      const result = await logBackdatedJob({
        job_type: jobType,
        description,
        postcode,
        backdated_period,
        invitee_email: inviteeEmail,
        invitee_phone: inviteePhone,
        initiated_by: initiatedBy,
        review: reviewOpen ? {
          overall_rating: overallRating,
          quality_score:       qualityScore || undefined,
          reliability_score:   reliabilityScore || undefined,
          value_score:         valueScore || undefined,
          payment_score:       paymentScore || undefined,
          scope_clarity_score: scopeClarityScore || undefined,
          site_access_score:   siteAccessScore || undefined,
          communication_score: communicationScore || undefined,
          would_work_again:    wouldWorkAgain,
          written_review:      writtenReview || undefined,
          red_flag:            redFlag || undefined,
          red_flag_reason:     redFlag && redFlagReason ? redFlagReason : undefined,
        } : undefined,
      })

      if (result.success) {
        setSuccess({ jobId: result.jobId, inviteeSentTo: result.inviteeSentTo, reviewSaved: result.reviewSaved })
      } else {
        if (result.field) {
          setFieldErrors({ [result.field]: result.error })
        } else {
          setGlobalError(result.error)
        }
      }
    })
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-brand-navy">
          {success.reviewSaved ? 'Invite sent & review saved' : 'Invite sent'}
        </h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          {success.reviewSaved
            ? <>Your invite has been sent and your review saved. <span className="font-medium text-brand-navy">{success.inviteeSentTo}</span> will be notified.</>
            : <>Once <span className="font-medium text-brand-navy">{success.inviteeSentTo}</span> confirms, you can both leave verified reviews.</>}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={`/jobs/${success.jobId}`}
            className="block w-full rounded-lg bg-brand-navy px-4 py-3 text-base font-semibold text-white text-center hover:opacity-90 transition-opacity"
          >
            View job
          </a>
          <button
            type="button"
            onClick={() => {
              setSuccess(null)
              setJobType(''); setDescription(''); setPostcode('')
              setMonth(''); setYear('')
              setInviteeEmail(''); setInviteePhone('')
              setReviewOpen(false); resetReview()
            }}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Add another past job
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-brand-navy mb-1">Add a past job</h2>
      <p className="text-sm text-gray-500 mb-6">
        {initiatedBy === 'trade'
          ? 'Log a past job and invite your client to confirm — both parties can then leave verified reviews.'
          : 'Log a past job and invite the tradesperson to confirm — both parties can then leave verified reviews.'}
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Job type */}
        <Field label="Job type" error={fieldErrors.job_type} required>
          <select
            value={jobType}
            onChange={e => { setJobType(e.target.value); clearFieldError('job_type') }}
            disabled={isPending}
            className={selectCls(!!fieldErrors.job_type)}
          >
            <option value="">Select job type…</option>
            {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        {/* Description */}
        <Field label="Description" hint={`${description.length}/500`} error={fieldErrors.description}>
          <textarea
            value={description}
            onChange={e => { setDescription(e.target.value); clearFieldError('description') }}
            disabled={isPending}
            rows={3}
            placeholder="Brief description of the work (optional)…"
            maxLength={500}
            className={`${inputCls(!!fieldErrors.description)} resize-none`}
          />
        </Field>

        {/* Approximate period */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Approximate period <span className="text-red-500">*</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={month}
              onChange={e => { setMonth(e.target.value); clearFieldError('backdated_period') }}
              disabled={isPending}
              className={selectCls(!!fieldErrors.backdated_period)}
              aria-label="Month"
            >
              <option value="">Month…</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => { setYear(e.target.value); clearFieldError('backdated_period') }}
              disabled={isPending}
              className={selectCls(!!fieldErrors.backdated_period)}
              aria-label="Year"
            >
              <option value="">Year…</option>
              {years.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          {fieldErrors.backdated_period && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.backdated_period}</p>
          )}
        </div>

        {/* Postcode */}
        <Field label="Job postcode" error={fieldErrors.postcode} required>
          <input
            type="text"
            value={postcode}
            onChange={e => { setPostcode(e.target.value.toUpperCase()); clearFieldError('postcode') }}
            disabled={isPending}
            placeholder="SW1A 1AA"
            className={inputCls(!!fieldErrors.postcode)}
          />
        </Field>

        {/* Invitee contact */}
        <div className="pt-2">
          <p className="text-sm font-medium text-gray-700 mb-1 capitalize">
            {inviteeLabel} contact <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-gray-400 mb-4">Provide at least one — email is preferred.</p>
          <div className="space-y-3">
            <Field
              label={`${inviteeLabel.charAt(0).toUpperCase() + inviteeLabel.slice(1)} email`}
              error={fieldErrors.invitee_email}
            >
              <input
                type="email"
                inputMode="email"
                value={inviteeEmail}
                onChange={e => { setInviteeEmail(e.target.value); clearFieldError('invitee_email') }}
                disabled={isPending}
                placeholder="their@email.com"
                className={inputCls(!!fieldErrors.invitee_email)}
              />
            </Field>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <Field
              label={`${inviteeLabel.charAt(0).toUpperCase() + inviteeLabel.slice(1)} mobile`}
              error={fieldErrors.invitee_phone}
            >
              <input
                type="tel"
                inputMode="tel"
                value={inviteePhone}
                onChange={e => { setInviteePhone(e.target.value); clearFieldError('invitee_phone') }}
                disabled={isPending}
                placeholder="07700 900000"
                className={inputCls(!!fieldErrors.invitee_phone)}
              />
            </Field>
          </div>
        </div>

        {/* ── Optional review section ───────────────────────────── */}
        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reviewOpen}
              onChange={e => { setReviewOpen(e.target.checked); if (!e.target.checked) resetReview() }}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-amber focus:ring-brand-amber"
            />
            <span className="text-sm font-medium text-gray-700">
              Leave your review now{' '}
              <span className="font-normal text-gray-400">(optional — saves you coming back later)</span>
            </span>
          </label>

          {reviewOpen && (
            <div className="mt-5 space-y-5">
              {/* Overall rating */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Overall rating <span className="text-red-500">*</span>
                </p>
                <StarPicker value={overallRating} onChange={setOverallRating} disabled={isPending} />
                {reviewError && (
                  <p className="mt-1 text-xs text-red-600">{reviewError}</p>
                )}
              </div>

              {initiatedBy === 'client' ? (
                // Client reviewing trade
                <>
                  <StarField label="Quality of work" value={qualityScore} onChange={setQualityScore} disabled={isPending} />
                  <StarField label="Communication"   value={communicationScore} onChange={setCommunicationScore} disabled={isPending} />
                  <StarField label="Reliability"     value={reliabilityScore} onChange={setReliabilityScore} disabled={isPending} />
                  <StarField label="Value"           value={valueScore} onChange={setValueScore} disabled={isPending} />
                  <YesNoField label="Would hire again" value={wouldWorkAgain} onChange={setWouldWorkAgain} disabled={isPending} />
                </>
              ) : (
                // Trade reviewing client
                <>
                  <StarField label="Payment"       value={paymentScore} onChange={setPaymentScore} disabled={isPending} />
                  <StarField label="Communication" value={communicationScore} onChange={setCommunicationScore} disabled={isPending} />
                  <StarField label="Scope clarity" value={scopeClarityScore} onChange={setScopeClarityScore} disabled={isPending} />
                  <StarField label="Site access"   value={siteAccessScore} onChange={setSiteAccessScore} disabled={isPending} />
                  <YesNoField label="Would work with again" value={wouldWorkAgain} onChange={setWouldWorkAgain} disabled={isPending} />
                  <RedFlagField
                    redFlag={redFlag}
                    onToggle={v => { setRedFlag(v); if (!v) setRedFlagReason('') }}
                    reason={redFlagReason}
                    onReason={setRedFlagReason}
                    disabled={isPending}
                  />
                </>
              )}

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
                  placeholder="Share your experience…"
                  className={`${inputCls(false)} resize-none`}
                />
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                {initiatedBy === 'client'
                  ? 'Your review is saved privately and published once the tradesperson confirms and leaves their review too.'
                  : 'Your review is saved privately and published once the client confirms and leaves their review too.'}
              </p>
            </div>
          )}
        </div>

        {globalError && (
          <p role="alert" className="text-sm text-red-600">{globalError}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy
            transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Sending invite…' : 'Send invite'}
        </button>
      </form>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function Field({ label, hint, required, error, children }: {
  label: string; hint?: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function StarPicker({ value, onChange, disabled }: {
  value: number; onChange: (v: number) => void; disabled: boolean
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          disabled={disabled}
          className={`text-3xl leading-none transition-colors disabled:opacity-50 ${
            s <= value ? 'text-brand-amber' : 'text-gray-200 hover:text-amber-200'
          }`}
          aria-label={`${s} star${s !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function StarField({ label, value, onChange, disabled }: {
  label: string; value: number; onChange: (v: number) => void; disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <StarPicker value={value} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function YesNoField({ label, value, onChange, disabled }: {
  label: string; value: boolean | null; onChange: (v: boolean) => void; disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex gap-2 shrink-0">
        {([true, false] as const).map(v => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            disabled={disabled}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              value === v
                ? v
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-red-400 bg-red-50 text-red-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}

function RedFlagField({ redFlag, onToggle, reason, onReason, disabled }: {
  redFlag: boolean
  onToggle: (v: boolean) => void
  reason: RedFlagReason | ''
  onReason: (v: RedFlagReason) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-600">Red flag this client</span>
        <button
          type="button"
          onClick={() => onToggle(!redFlag)}
          disabled={disabled}
          className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            redFlag
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          {redFlag ? 'Yes' : 'No'}
        </button>
      </div>
      {redFlag && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
          <select
            value={reason}
            onChange={e => onReason(e.target.value as RedFlagReason)}
            disabled={disabled}
            className={selectCls(false)}
          >
            <option value="">Select a reason…</option>
            {RED_FLAG_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      )}
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
