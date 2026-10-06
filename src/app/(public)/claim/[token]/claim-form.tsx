'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { removeSeededProfile } from '@/actions/remove-seeded-profile'

async function sendClaimOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  // Calls the API route rather than directly importing twilio in a client component
  const res = await fetch('/api/claim/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  return res.json()
}

async function verifyClaimOTP(
  phone: string,
  code: string,
  token: string,
): Promise<{ success: boolean; redirectTo?: string; error?: string }> {
  const res = await fetch('/api/claim/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code, token }),
  })
  return res.json()
}

type Props = {
  claimToken: string
  businessName: string
  contactPhone: string | null
  contactEmailMasked: string | null
}

type Mode = 'idle' | 'otp_sending' | 'otp_sent' | 'removing' | 'removed' | 'claimed'

export function ClaimForm({ claimToken, businessName, contactPhone, contactEmailMasked }: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'otp_sent') codeInputRef.current?.focus()
  }, [mode])

  function handleSendOTP() {
    if (!contactPhone) return
    setError(null)
    setMode('otp_sending')
    startTransition(async () => {
      const result = await sendClaimOTP(contactPhone)
      if (result.success) {
        setMode('otp_sent')
      } else {
        setMode('idle')
        setError(result.error ?? 'Could not send the verification code. Please try again.')
      }
    })
  }

  function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await verifyClaimOTP(contactPhone!, otpCode, claimToken)
      if (result.success && result.redirectTo) {
        window.location.href = result.redirectTo
      } else {
        setError(result.error ?? 'Verification failed. Please try again.')
      }
    })
  }

  function handleRemove(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMode('removing')
    startTransition(async () => {
      const result = await removeSeededProfile(claimToken)
      if (result.success) {
        setMode('removed')
      } else {
        setMode('idle')
        setError(result.error)
      }
    })
  }

  if (mode === 'removed') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-5">
        <p className="font-semibold text-green-800">Listing removed</p>
        <p className="mt-1 text-sm text-green-700">
          The page for {businessName} has been deleted and we have added this business to our
          do-not-contact list. We will not create another listing for this business.
        </p>
      </div>
    )
  }

  if (mode === 'claimed') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-5">
        <p className="font-semibold text-green-800">Identity verified</p>
        <p className="mt-1 text-sm text-green-700">
          Taking you to complete your profile...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Claim section ────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-amber/30 bg-amber-50 p-6">
        <h2 className="font-semibold text-brand-navy">Is this your business?</h2>
        <p className="mt-1 mb-4 text-sm text-gray-600">
          Claiming is free. You will be able to add your own details and collect verified reviews.
        </p>

        {contactPhone && mode === 'idle' && (
          <button
            onClick={handleSendOTP}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Sending code…' : 'Yes, verify by phone'}
          </button>
        )}

        {contactPhone && mode === 'otp_sending' && (
          <p className="text-sm text-gray-500">Sending a verification code…</p>
        )}

        {contactPhone && mode === 'otp_sent' && (
          <form onSubmit={handleVerifyOTP} className="space-y-3 mt-2">
            <p className="text-sm text-gray-600">
              We sent a 6-digit code to the phone number on file. Enter it below to prove ownership.
            </p>
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-40 rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg font-mono tracking-widest focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending || otpCode.length !== 6}
                className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Verifying…' : 'Verify and continue'}
              </button>
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={isPending}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {!contactPhone && contactEmailMasked && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              We will verify your identity by email. Create or sign in with{' '}
              <strong>{contactEmailMasked}</strong> to complete the claim.
            </p>
            <a
              href={`/join/trade?seeded_token=${encodeURIComponent(claimToken)}`}
              className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Continue to create your profile
            </a>
          </div>
        )}
      </div>

      {/* ── Remove section ───────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-700">Not your listing?</h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">
          If this is not your business, you can remove the page immediately. No account needed.
          We will not create another listing for this business.
        </p>
        <form onSubmit={handleRemove}>
          <button
            type="submit"
            disabled={isPending || mode === 'removing'}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {mode === 'removing' ? 'Removing…' : 'Remove this page'}
          </button>
        </form>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
