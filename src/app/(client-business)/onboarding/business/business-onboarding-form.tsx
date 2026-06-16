'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { lookupCompany, verifyCompany, type CompanyLookupResult } from '@/actions/verify-company'

type LookupState = 'idle' | 'checking' | 'found' | 'not_found' | 'error'

const CH_NUMBER_RE = /^[A-Z0-9]{8}$/i

function normalizeChNumber(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/\s/g, '')
  if (/^\d+$/.test(cleaned) && cleaned.length < 8) return cleaned.padStart(8, '0')
  return cleaned
}

export function BusinessOnboardingForm({ userFullName }: { userFullName: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [chInput, setChInput] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [lookupData, setLookupData] = useState<Extract<CompanyLookupResult, { found: true }> | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null)

  // 600ms debounced lookup
  useEffect(() => {
    const normalized = normalizeChNumber(chInput)
    if (!chInput.trim()) { setLookupState('idle'); setLookupData(null); setLookupError(null); return }
    if (!CH_NUMBER_RE.test(normalized)) { setLookupState('idle'); setLookupData(null); setLookupError(null); return }

    setLookupState('checking')
    setLookupData(null)
    setLookupError(null)

    const timer = setTimeout(async () => {
      try {
        const result = await lookupCompany(normalized)
        if (result.found) {
          setLookupData(result)
          setLookupState('found')
        } else {
          setLookupError(result.reason)
          setLookupState('not_found')
        }
      } catch {
        setLookupError('Could not reach Companies House. Please try again.')
        setLookupState('error')
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [chInput])

  const canSubmit =
    lookupState === 'found' &&
    lookupData !== null &&
    lookupData.company_status === 'active' &&
    !isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitError(null)
    setSubmitErrorCode(null)

    startTransition(async () => {
      const result = await verifyCompany(normalizeChNumber(chInput), userFullName)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setSubmitError(result.error)
        setSubmitErrorCode(result.code)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-brand-navy mb-1">Register your business</h2>
      <p className="text-sm text-gray-500 mb-6">
        We verify your company through Companies House to build trust with tradespeople.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Companies House number */}
        <div>
          <label htmlFor="ch_number" className="block text-sm font-medium text-gray-700 mb-1.5">
            Companies House number<span className="ml-0.5 text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="ch_number"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={chInput}
              onChange={(e) => {
                setChInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                setSubmitError(null)
              }}
              placeholder="12345678"
              maxLength={8}
              className={`w-full rounded-lg border px-4 py-3 text-base font-mono tracking-wider pr-10
                focus:outline-none focus:ring-2 focus:border-transparent
                ${lookupState === 'not_found' || lookupState === 'error'
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-brand-amber'
                }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              {lookupState === 'checking' && <SpinnerIcon />}
              {lookupState === 'found' && <CheckIcon />}
              {(lookupState === 'not_found' || lookupState === 'error') && <XIcon />}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Find this on{' '}
            <span className="text-brand-navy font-medium">find-and-update.company-information.service.gov.uk</span>
          </p>
        </div>

        {/* Company info card */}
        {lookupState === 'found' && lookupData && (
          <div className={`mt-4 rounded-xl border-2 p-4
            ${lookupData.company_status === 'active'
              ? 'border-green-200 bg-green-50'
              : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                ${lookupData.company_status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`}
              >
                {lookupData.company_status === 'active'
                  ? <CheckIcon size="sm" />
                  : <span className="text-white text-xs font-bold">!</span>
                }
              </div>
              <div>
                <p className="font-semibold text-brand-navy text-sm">{lookupData.company_name}</p>
                <p className={`text-xs mt-0.5 capitalize
                  ${lookupData.company_status === 'active' ? 'text-green-700' : 'text-amber-700'}`}
                >
                  Status: {lookupData.company_status}
                </p>
                {lookupData.company_status !== 'active' && (
                  <p className="mt-1.5 text-xs text-amber-800">
                    Only active companies can register on WorkedWith.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lookup error */}
        {(lookupState === 'not_found' || lookupState === 'error') && lookupError && (
          <p className="mt-2 text-sm text-red-600">{lookupError}</p>
        )}

        {/* Director confirmation notice */}
        {lookupState === 'found' && lookupData?.company_status === 'active' && (
          <div className="mt-5 rounded-xl bg-brand-navy/5 border border-brand-navy/10 p-4">
            <p className="text-sm text-brand-navy">
              <span className="font-semibold">Director check: </span>
              We&apos;ll verify that{' '}
              <span className="font-semibold">{userFullName}</span>{' '}
              is listed as an active director or person with significant control (PSC)
              for this company at Companies House.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Your name must match exactly as it appears at Companies House. If it doesn&apos;t match,
              update your name in your account settings first.
            </p>
          </div>
        )}

        {/* Submit error — differentiated by code */}
        {submitError && (
          <div className={`mt-5 rounded-xl border p-4
            ${submitErrorCode === 'name_not_matched'
              ? 'border-amber-300 bg-amber-50'
              : 'border-red-200 bg-red-50'
            }`}
          >
            <p className={`text-sm
              ${submitErrorCode === 'name_not_matched' ? 'text-amber-800' : 'text-red-700'}`}
            >
              {submitError}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold
            text-brand-navy transition-opacity hover:opacity-90
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Verifying with Companies House…' : 'Verify and create account'}
        </button>
      </form>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 100 24v-4l-3 3 3 3v4A12 12 0 014 12z" />
    </svg>
  )
}

function CheckIcon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-3 w-3 text-white' : 'h-4 w-4 text-green-500'
  return (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd" />
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
