'use client'

import { useState, useTransition } from 'react'
import { TRADE_TYPES } from '@/actions/create-trade-profile'
import { logBackdatedJob } from '@/actions/log-backdated-job'
import type { JobInitiatedBy } from '@/types/database'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

type FieldErrors = Partial<Record<
  'job_type' | 'description' | 'postcode' | 'backdated_period' | 'invitee_email' | 'invitee_phone',
  string
>>

export function BackdatedJobForm({ initiatedBy }: { initiatedBy: JobInitiatedBy }) {
  const [isPending, startTransition] = useTransition()
  const [jobType, setJobType] = useState('')
  const [description, setDescription] = useState('')
  const [postcode, setPostcode] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [inviteePhone, setInviteePhone] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ jobId: string; inviteeSentTo: string } | null>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

  const inviteeLabel = initiatedBy === 'trade' ? 'client' : 'tradesperson'

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})

    const backdated_period = month && year ? `${MONTHS[parseInt(month) - 1]} ${year}` : ''

    if (!month || !year) {
      setFieldErrors({ backdated_period: 'Please select a month and year.' })
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
        <h2 className="text-xl font-semibold text-brand-navy">Invite sent</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Once{' '}
          <span className="font-medium text-brand-navy">{success.inviteeSentTo}</span>
          {' '}confirms, you can both leave verified reviews.
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
