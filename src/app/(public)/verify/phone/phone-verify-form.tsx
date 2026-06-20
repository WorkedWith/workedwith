'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { sendOTP, verifyOTP } from '@/actions/verify-phone'

type Step = 'phone' | 'code'

export function PhoneVerifyForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signInHint, setSignInHint] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus()
  }, [step])

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await sendOTP(phone)
      if (result.success) {
        setSignInHint(null)
        setStep('code')
      } else {
        setError(result.error)
        setSignInHint(result.redirectTo ?? null)
      }
    })
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await verifyOTP(phone, code)
      if (result.success) {
        router.push(result.redirectTo)
      } else {
        setError(result.error)
      }
    })
  }

  function handleResend() {
    setError(null)
    setCode('')
    startTransition(async () => {
      const result = await sendOTP(phone)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <StepDot active={step === 'phone'} done={step === 'code'} label="1" />
        <div className="h-px flex-1 bg-gray-200" />
        <StepDot active={step === 'code'} done={false} label="2" />
      </div>

      {step === 'phone' ? (
        <form onSubmit={handlePhoneSubmit} noValidate>
          <h2 className="text-xl font-semibold text-brand-navy mb-1">
            Enter your mobile number
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            UK mobiles only. We&apos;ll send a 6-digit code by SMS.
          </p>

          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            Mobile number
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="07700 900000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isPending}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base
              focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent
              disabled:opacity-50 disabled:bg-gray-50"
          />

          {error && (
            <>
              <ErrorMessage message={error} />
              {signInHint && (
                <a
                  href={signInHint}
                  className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border-2 border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                >
                  Sign in to your account
                </a>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={isPending || phone.trim() === ''}
            className="mt-5 w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold
              text-brand-navy transition-opacity hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} noValidate>
          <h2 className="text-xl font-semibold text-brand-navy mb-1">
            Enter the 6-digit code
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Sent to <span className="font-medium text-gray-700">{phone}</span>
          </p>

          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1.5">
            Verification code
          </label>
          <input
            id="code"
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isPending}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-2xl
              tracking-[0.5em] text-center font-mono
              focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent
              disabled:opacity-50 disabled:bg-gray-50"
          />

          {error && <ErrorMessage message={error} />}

          <button
            type="submit"
            disabled={isPending || code.length !== 6}
            className="mt-5 w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold
              text-brand-navy transition-opacity hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Verifying…' : 'Verify number'}
          </button>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setStep('phone'); setError(null); setCode('') }}
              disabled={isPending}
              className="text-gray-500 hover:text-brand-navy disabled:opacity-40"
            >
              Change number
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending}
              className="text-brand-amber font-medium hover:opacity-80 disabled:opacity-40"
            >
              Resend code
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  const base = 'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors'
  if (done) return <span className={`${base} bg-brand-amber text-brand-navy`}>✓</span>
  if (active) return <span className={`${base} bg-brand-navy text-white`}>{label}</span>
  return <span className={`${base} border-2 border-gray-300 text-gray-400`}>{label}</span>
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-2.5 text-sm text-red-600">
      {message}
    </p>
  )
}
