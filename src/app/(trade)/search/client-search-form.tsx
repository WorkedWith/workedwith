'use client'

import { useState, useTransition } from 'react'
import { getClientProfile, type ClientProfileResult, type RecentReview } from '@/actions/get-client-profile'
import type { VerificationTier } from '@/types/database'

type Props = {
  onFirstSearch?: () => void
}

export function ClientSearchForm({ onFirstSearch }: Props = {}) {
  const [isPending, startTransition] = useTransition()
  const [emailInput, setEmailInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [result, setResult] = useState<ClientProfileResult | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInputError(null)
    setResult(null)

    const hasEmail = emailInput.trim() !== ''
    const hasPhone = phoneInput.trim() !== ''

    if (!hasEmail && !hasPhone) {
      setInputError("Please enter the client's email address or mobile number.")
      return
    }
    if (hasEmail && hasPhone) {
      setInputError('Please enter only one — email or mobile number, not both.')
      return
    }

    const identifier = hasEmail ? emailInput.trim() : phoneInput.trim()

    if (!hasSearched) {
      setHasSearched(true)
      onFirstSearch?.()
    }

    startTransition(async () => {
      const res = await getClientProfile(identifier)
      setResult(res)
    })
  }

  return (
    <div className="space-y-5">
      {/* Search form */}
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-brand-navy mb-1">Look up a client</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enter the client&apos;s email address or mobile number to view their WorkedWith profile before accepting a job.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Client email
            </label>
            <input
              type="email"
              inputMode="email"
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setInputError(null) }}
              disabled={isPending}
              placeholder="client@example.com"
              className={inputCls(false)}
              autoComplete="off"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Client mobile
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phoneInput}
              onChange={e => { setPhoneInput(e.target.value); setInputError(null) }}
              disabled={isPending}
              placeholder="07700 900000"
              className={inputCls(false)}
              autoComplete="off"
            />
          </div>

          {inputError && (
            <p role="alert" className="text-sm text-red-600">{inputError}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy
              transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Searching…' : 'Search'}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && <ResultCard result={result} />}
    </div>
  )
}

// ── Result card ───────────────────────────────────────────────

function ResultCard({ result }: { result: ClientProfileResult }) {
  if (result.status === 'rate_limited') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-semibold text-amber-900">Daily search limit reached</p>
        <p className="mt-1 text-sm text-amber-700">
          You have reached your daily search limit (20 searches). Try again tomorrow.
        </p>
      </div>
    )
  }

  if (result.status === 'not_found') {
    return (
      <div className="rounded-2xl bg-white shadow-xl p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No profile found</p>
        <p className="mt-1 text-sm text-gray-500">
          No WorkedWith profile found for this contact. They may not have joined yet.
        </p>
      </div>
    )
  }

  if (result.status === 'unauthorized' || result.status === 'unverified') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">Access error. Please refresh the page and try again.</p>
      </div>
    )
  }

  // free or pro
  return (
    <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
      {/* Navy header with rating and badge */}
      <div className="bg-brand-navy px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <StarDisplay rating={result.overall_rating} total={result.total_reviews} />
            <p className="mt-1 text-sm text-white/60">
              {result.total_reviews === 0
                ? 'No reviews yet'
                : `${result.total_reviews} verified review${result.total_reviews !== 1 ? 's' : ''}`}
            </p>
          </div>
          <VerificationBadge tier={result.verification_tier} />
        </div>
        <p className="mt-4 text-xs text-white/40">
          Member since {fmtMemberSince(result.member_since)}
        </p>
      </div>

      {/* Free tier body */}
      {result.status === 'free' && (
        <div className="px-6 py-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-900">Upgrade to Pro to see more</p>
            <p className="mt-1 text-xs text-amber-700 leading-relaxed">
              Pro subscribers can view payment reliability, communication score, scope clarity,
              red flag history, and written reviews for any client.
            </p>
          </div>
        </div>
      )}

      {/* Pro tier body */}
      {result.status === 'pro' && (
        <div className="divide-y divide-gray-100">
          {/* Score rows */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Scores</h3>
            <div className="divide-y divide-gray-100">
              <ScoreRow label="Payment reliability" score={result.payment_reliability_score} total={result.total_reviews} />
              <ScoreRow label="Communication"       score={result.communication_score}       total={result.total_reviews} />
              <ScoreRow label="Scope clarity"       score={result.scope_clarity_score}       total={result.total_reviews} />
            </div>
          </div>

          {/* Red flags */}
          {result.red_flag_count > 0 ? (
            <div className="px-6 py-4">
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${result.red_flag_count >= 3 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                <span className={`text-xl leading-none ${result.red_flag_count >= 3 ? 'text-red-500' : 'text-amber-500'}`}>⚑</span>
                <div>
                  <p className={`text-sm font-semibold ${result.red_flag_count >= 3 ? 'text-red-800' : 'text-amber-800'}`}>
                    {result.red_flag_count} red flag{result.red_flag_count !== 1 ? 's' : ''}
                  </p>
                  <p className={`text-xs ${result.red_flag_count >= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                    Raised by verified tradespeople on WorkedWith
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 text-green-700">
                <span className="text-sm">✓</span>
                <p className="text-sm font-medium">No red flags</p>
              </div>
            </div>
          )}

          {/* Written reviews */}
          <ReviewsList reviews={result.recent_reviews} />
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function StarDisplay({ rating, total }: { rating: number; total: number }) {
  if (total === 0) {
    return <p className="text-lg font-semibold text-white/60">No reviews yet</p>
  }
  const filled = Math.round(rating)
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-white">{rating.toFixed(1)}</span>
      <div className="flex text-lg">
        {[1, 2, 3, 4, 5].map(s => (
          <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-white/20'}>★</span>
        ))}
      </div>
    </div>
  )
}

function VerificationBadge({ tier }: { tier: VerificationTier }) {
  if (tier === 'fully_verified') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
        ✓ ID verified
      </span>
    )
  }
  if (tier === 'phone_verified') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
        ✓ Phone verified
      </span>
    )
  }
  return (
    <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      Unverified
    </span>
  )
}

function ScoreRow({ label, score, total }: { label: string; score: number; total: number }) {
  if (total === 0) {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm text-gray-400">—</span>
      </div>
    )
  }
  const filled = Math.round(score)
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={`text-sm ${s <= filled ? 'text-brand-amber' : 'text-gray-200'}`}>●</span>
          ))}
        </div>
        <span className="w-7 text-right text-sm font-medium tabular-nums text-gray-900">
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

function ReviewsList({ reviews }: { reviews: RecentReview[] }) {
  const withText = reviews.filter(r => r.written_review)
  if (withText.length === 0) return null

  return (
    <div className="px-6 py-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Written reviews</h3>
      <div className="space-y-0 divide-y divide-gray-100">
        {withText.map((review, i) => (
          <div key={i} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">{review.reviewer_trade_type}</span>
              <span className="text-xs text-gray-400">{fmtDate(review.submitted_at)}</span>
            </div>
            {review.overall_rating !== null && (
              <div className="flex mb-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={`text-sm ${s <= (review.overall_rating ?? 0) ? 'text-brand-amber' : 'text-gray-200'}`}>★</span>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-700 leading-relaxed">{review.written_review}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Utilities ─────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function inputCls(hasErr: boolean) {
  return `w-full rounded-lg border px-4 py-3 text-base
    focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50
    ${hasErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-brand-amber'}`
}
