'use client'

import { useState, useTransition } from 'react'
import { TRADE_TYPES } from '@/actions/create-trade-profile'
import { logJob, type LogJobInput } from '@/actions/log-job'

type FieldErrors = Partial<Record<keyof LogJobInput, string>>

const PAYMENT_TERM_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: '0', label: 'On completion (0 days)' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
]

export function LogJobForm() {
  const [isPending, startTransition] = useTransition()
  const [jobType, setJobType] = useState('')
  const [description, setDescription] = useState('')
  const [postcode, setPostcode] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [inviteePhone, setInviteePhone] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ jobId: string; inviteeSentTo: string } | null>(null)

  function clearFieldError(field: keyof LogJobInput) {
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})

    startTransition(async () => {
      const result = await logJob({
        job_type: jobType,
        description,
        postcode,
        started_at: startedAt,
        invitee_email: inviteeEmail,
        invitee_phone: inviteePhone,
        agreed_payment_terms_days: paymentTerms,
      })

      if (result.success) {
        setSuccess({ jobId: result.jobId, inviteeSentTo: result.inviteeSentTo })
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
        <h2 className="text-xl font-semibold text-brand-navy">Job logged</h2>
        <p className="mt-2 text-sm text-gray-600">
          Invite sent to <span className="font-medium text-brand-navy">{success.inviteeSentTo}</span>.
          They&apos;ll receive an email to confirm the job on WorkedWith.
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
              setJobType(''); setDescription(''); setPostcode(''); setStartedAt('')
              setInviteeEmail(''); setInviteePhone(''); setPaymentTerms('')
            }}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log another job
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-brand-navy mb-1">Log a job</h2>
      <p className="text-sm text-gray-500 mb-6">
        Your client will receive an invite to confirm the job on WorkedWith.
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

        {/* Start date */}
        <Field label="Approximate start date" hint="Optional">
          <input
            type="date"
            value={startedAt}
            onChange={e => setStartedAt(e.target.value)}
            disabled={isPending}
            className={inputCls(false)}
          />
        </Field>

        {/* Payment terms */}
        <Field label="Agreed payment terms" hint="Optional">
          <select
            value={paymentTerms}
            onChange={e => setPaymentTerms(e.target.value)}
            disabled={isPending}
            className={selectCls(false)}
          >
            {PAYMENT_TERM_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        {/* Client contact — divider */}
        <div className="pt-2">
          <p className="text-sm font-medium text-gray-700 mb-1">
            Client contact <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-gray-400 mb-4">Provide at least one — email is preferred.</p>

          <div className="space-y-3">
            <Field label="Client email" error={fieldErrors.invitee_email}>
              <input
                type="email"
                inputMode="email"
                value={inviteeEmail}
                onChange={e => { setInviteeEmail(e.target.value); clearFieldError('invitee_email') }}
                disabled={isPending}
                placeholder="client@example.com"
                className={inputCls(!!fieldErrors.invitee_email)}
              />
            </Field>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Field label="Client mobile" error={fieldErrors.invitee_phone}>
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

        {globalError && (
          <p role="alert" className="text-sm text-red-600">{globalError}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy
            transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Sending invite…' : 'Log job and send invite'}
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
