'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TRADE_TYPES } from '@/lib/trade-types'
import { createTradeProfile, type CreateTradeProfileInput } from '@/actions/create-trade-profile'
import { checkUsername } from '@/actions/check-username'

type Step = 1 | 2
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
type FieldErrors = Partial<Record<keyof CreateTradeProfileInput, string>>

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i

export function TradeOnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [isPending, startTransition] = useTransition()

  const [tradeType, setTradeType] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [postcode, setPostcode] = useState('')
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')

  // Debounced username check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) { setUsernameStatus('idle'); return }
    if (!/^[a-z0-9-]{3,30}$/.test(trimmed)) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername(trimmed)
        setUsernameStatus(result.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('idle')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [username])

  function validateStep1(): FieldErrors {
    const errors: FieldErrors = {}
    if (!tradeType) errors.trade_type = 'Please select your trade type.'
    if (!postcode.trim()) {
      errors.postcode = 'Please enter your postcode.'
    } else if (!UK_POSTCODE_RE.test(postcode.trim())) {
      errors.postcode = 'Please enter a valid UK postcode.'
    }
    if (bio.length > 300) errors.bio = 'Bio must be 300 characters or fewer.'
    return errors
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateStep1()
    setFieldErrors(errors)
    if (Object.keys(errors).length === 0) setStep(2)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (usernameStatus !== 'available') return
    setGlobalError(null)
    startTransition(async () => {
      const result = await createTradeProfile({
        trade_type: tradeType,
        company_name: companyName,
        postcode,
        bio,
        username: username.trim().toLowerCase(),
      })
      if (result.success) {
        router.push('/dashboard')
      } else {
        if (result.field) {
          setFieldErrors({ [result.field]: result.error })
        } else {
          setGlobalError(result.error)
        }
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-7">
        <StepDot n={1} current={step} />
        <div className="h-px flex-1 bg-gray-200" />
        <StepDot n={2} current={step} />
      </div>

      {step === 1 ? (
        <form onSubmit={handleNext} noValidate>
          <h2 className="text-xl font-semibold text-brand-navy mb-1">Your trade</h2>
          <p className="text-sm text-gray-500 mb-6">Tell us what you do and where you&apos;re based.</p>

          {/* Trade type */}
          <Field label="Trade type" error={fieldErrors.trade_type} required>
            <select
              value={tradeType}
              onChange={(e) => { setTradeType(e.target.value); setFieldErrors(prev => ({ ...prev, trade_type: undefined })) }}
              className={selectClass(!!fieldErrors.trade_type)}
            >
              <option value="">Select your trade…</option>
              {TRADE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          {/* Company name */}
          <Field label="Company name" hint="Optional" className="mt-4">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company or trading name"
              className={inputClass(false)}
            />
          </Field>

          {/* Postcode */}
          <Field label="Postcode" error={fieldErrors.postcode} required className="mt-4">
            <input
              type="text"
              value={postcode}
              onChange={(e) => { setPostcode(e.target.value); setFieldErrors(prev => ({ ...prev, postcode: undefined })) }}
              placeholder="SW1A 1AA"
              className={inputClass(!!fieldErrors.postcode)}
            />
          </Field>

          {/* Bio */}
          <Field label="Bio" hint="Optional — 300 characters max" error={fieldErrors.bio} className="mt-4">
            <textarea
              value={bio}
              onChange={(e) => { setBio(e.target.value); setFieldErrors(prev => ({ ...prev, bio: undefined })) }}
              rows={3}
              placeholder="Tell clients a bit about yourself and your experience…"
              className={`${inputClass(!!fieldErrors.bio)} resize-none`}
            />
            <p className={`mt-1 text-right text-xs ${bio.length > 300 ? 'text-red-500' : 'text-gray-400'}`}>
              {bio.length} / 300
            </p>
          </Field>

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy transition-opacity hover:opacity-90"
          >
            Next
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h2 className="text-xl font-semibold text-brand-navy mb-1">Choose your username</h2>
          <p className="text-sm text-gray-500 mb-6">
            This becomes your public profile URL. You can&apos;t change it later.
          </p>

          <Field label="Username" error={fieldErrors.username} required>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  setFieldErrors(prev => ({ ...prev, username: undefined }))
                }}
                placeholder="your-username"
                maxLength={30}
                className={inputClass(!!fieldErrors.username || usernameStatus === 'taken')}
                autoComplete="off"
                spellCheck={false}
              />
              {/* Status icon */}
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && <SpinnerIcon />}
                {usernameStatus === 'available' && <CheckIcon />}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XIcon />}
              </span>
            </div>

            {/* Status message */}
            {usernameStatus === 'available' && (
              <p className="mt-1.5 text-xs text-green-600">Username available</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="mt-1.5 text-xs text-red-600">Username already taken</p>
            )}
            {usernameStatus === 'invalid' && username.length > 0 && (
              <p className="mt-1.5 text-xs text-red-600">
                3–30 characters — letters, numbers, and hyphens only
              </p>
            )}

            {/* URL preview */}
            {usernameStatus === 'available' && (
              <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-500">Your profile: </span>
                <span className="font-medium text-brand-navy">
                  workedwith.co.uk/t/{username.trim().toLowerCase()}
                </span>
              </div>
            )}
          </Field>

          {globalError && <ErrorMessage message={globalError} className="mt-4" />}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => { setStep(1); setGlobalError(null) }}
              disabled={isPending}
              className="flex-none rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isPending || usernameStatus !== 'available'}
              className="flex-1 rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'Creating profile…' : 'Complete profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function StepDot({ n, current }: { n: number; current: Step }) {
  const done = current > n
  const active = current === n
  const base = 'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors shrink-0'
  if (done) return <span className={`${base} bg-brand-amber text-brand-navy`}>✓</span>
  if (active) return <span className={`${base} bg-brand-navy text-white`}>{n}</span>
  return <span className={`${base} border-2 border-gray-300 text-gray-400`}>{n}</span>
}

function Field({
  label, hint, required, error, children, className,
}: {
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
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

function ErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <p role="alert" className={`text-sm text-red-600 ${className ?? ''}`}>
      {message}
    </p>
  )
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-4 py-3 text-base pr-10
    focus:outline-none focus:ring-2 focus:border-transparent
    ${hasError
      ? 'border-red-400 focus:ring-red-400'
      : 'border-gray-300 focus:ring-brand-amber'
    }`
}

function selectClass(hasError: boolean) {
  return `w-full rounded-lg border px-4 py-3 text-base bg-white
    focus:outline-none focus:ring-2 focus:border-transparent
    ${hasError
      ? 'border-red-400 focus:ring-red-400'
      : 'border-gray-300 focus:ring-brand-amber'
    }`
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 100 24v-4l-3 3 3 3v4A12 12 0 014 12z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}
