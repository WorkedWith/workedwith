'use client'

import { useState } from 'react'

const FREE_FEATURES = [
  'Appear in search results',
  'Unlimited job logging',
  'Backdated jobs',
  'Unlimited reviews',
  'Blind review submission',
  'Respond to reviews',
  'Basic client lookup (overall rating only)',
  'Public profile page',
]

const STANDARD_FEATURES = [
  'Everything in Free',
  'Full client profile on lookup (payment reliability, red flag history, written review excerpts)',
  'Verified badge on your public profile',
  'Featured job images (3 jobs, up to 5 images each)',
]

const PRO_FEATURES = [
  'Everything in Standard',
  'Top of local search results (randomised rotation within Pro band)',
  'Featured badge in search results',
  'Extended featured job images (5 jobs, up to 10 images each)',
  'Profile analytics (views and search appearances)',
  'Priority dispute resolution',
]

function FeatureItem({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 text-sm font-bold ${light ? 'text-brand-amber' : 'text-brand-navy'}`}>✓</span>
      <span className={`text-sm leading-relaxed ${light ? 'text-white/80' : 'text-gray-600'}`}>{text}</span>
    </li>
  )
}

export function PricingCards() {
  const [annual, setAnnual] = useState(false)

  const standardMonthlyEq = annual ? '£8.33' : '£9.99'
  const standardPrice     = annual ? '£99.90/year' : '£9.99/month'
  const standardSub       = annual ? 'Save £19.98 per year, billed annually' : null

  const proMonthlyEq = annual ? '£33.33' : '£39.99'
  const proPrice     = annual ? '£399.90/year' : '£39.99/month'
  const proSub       = annual ? 'Save £79.98 per year, billed annually' : null

  // silence unused var warnings
  void standardMonthlyEq
  void proMonthlyEq

  return (
    <>
      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <span className={`text-sm font-medium ${!annual ? 'text-brand-navy' : 'text-gray-400'}`}>Monthly</span>
        <button
          type="button"
          onClick={() => setAnnual(a => !a)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            annual ? 'bg-brand-navy' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              annual ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${annual ? 'text-brand-navy' : 'text-gray-400'}`}>
          Annual
          {annual && (
            <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              2 months free
            </span>
          )}
        </span>
      </div>

      {/* Cards */}
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">

        {/* Free */}
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Free</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-5xl font-bold text-brand-navy">£0</span>
              <span className="mb-1.5 text-sm text-gray-400">forever</span>
            </div>
          </div>
          <ul className="mt-8 flex-1 space-y-3">
            {FREE_FEATURES.map(f => <FeatureItem key={f} text={f} />)}
          </ul>
          <p className="mt-5 text-xs text-gray-400 italic leading-relaxed">
            The Free tier is a fully functional product — not a time-limited trial.
          </p>
          <a
            href="/join/trade"
            className="mt-6 flex min-h-[48px] items-center justify-center rounded-xl border-2 border-brand-navy px-6 text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
          >
            Join free
          </a>
        </div>

        {/* Standard */}
        <div className="flex flex-col rounded-2xl border-2 border-brand-amber bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-900">Standard</p>
              <div className="mt-3">
                <span className="text-5xl font-bold text-brand-navy">{standardPrice.split('/')[0]}</span>
                <span className="text-sm text-gray-400">
                  {'/' + (standardPrice.split('/')[1] ?? 'month')}
                </span>
              </div>
              {standardSub && (
                <p className="mt-1.5 text-xs text-gray-500">{standardSub}</p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-brand-amber px-2.5 py-1 text-xs font-semibold text-brand-navy">
              Verified
            </span>
          </div>
          <ul className="mt-8 flex-1 space-y-3">
            {STANDARD_FEATURES.map(f => <FeatureItem key={f} text={f} />)}
          </ul>
          <a
            href="/join/trade"
            className="mt-8 flex min-h-[48px] items-center justify-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
          >
            Get Standard
          </a>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-2xl bg-brand-navy p-8 shadow-lg">
          <span className="absolute right-5 top-5 rounded-full bg-brand-amber px-3 py-1 text-xs font-bold text-brand-navy">
            Pro
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Pro</p>
            <div className="mt-3">
              <span className="text-5xl font-bold text-white">{proPrice.split('/')[0]}</span>
              <span className="text-sm text-white/50">
                {'/' + (proPrice.split('/')[1] ?? 'month')}
              </span>
            </div>
            {proSub && (
              <p className="mt-1.5 text-xs text-white/50">{proSub}</p>
            )}
          </div>
          <ul className="mt-8 flex-1 space-y-3">
            {PRO_FEATURES.map(f => <FeatureItem key={f} text={f} light />)}
          </ul>
          <a
            href="/join/trade"
            className="mt-8 flex min-h-[48px] items-center justify-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
          >
            Get Pro
          </a>
        </div>

      </div>
    </>
  )
}
