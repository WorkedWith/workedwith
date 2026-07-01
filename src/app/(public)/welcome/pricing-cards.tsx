'use client'

import { useState } from 'react'
import { UpgradeButton } from './upgrade-button'

const FREE_FEATURES = [
  'Appear in search results',
  'Unlimited jobs and reviews',
  'Blind review submission',
  'Respond to reviews',
  'Basic client lookup (overall rating only)',
  'Public profile page',
]

const STANDARD_EXTRAS = [
  'Full client profile on lookup (payment reliability, red flag history, written review excerpts)',
  'Verified badge on your public profile',
  'Featured job images (3 jobs, up to 5 images each)',
]

const PRO_EXTRAS = [
  'Top of local search results (randomised rotation within Pro band)',
  'Featured badge in search results',
  'Extended featured job images (5 jobs, up to 10 images each)',
  'Profile analytics (views and search appearances)',
  'Priority dispute resolution',
]

export function PricingCards() {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Monthly / Annual toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setPeriod('monthly')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              period === 'monthly'
                ? 'bg-brand-navy text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('annual')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              period === 'annual'
                ? 'bg-brand-navy text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Annual
            <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700">
              Save 2 months
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">

        {/* Free */}
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Free</p>
            <p className="mt-2 text-3xl font-bold text-brand-navy">
              £0 <span className="text-base font-normal text-gray-400">forever</span>
            </p>
          </div>
          <ul className="mt-6 flex-1 space-y-2.5">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                <Tick />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-7 space-y-3">
            <a
              href="/dashboard"
              className="block w-full rounded-lg border-2 border-brand-navy py-2.5 text-center text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
            >
              Continue with free
            </a>
            <p className="text-center text-xs text-gray-400">
              The Free tier is a permanent fully functional product — not a trial.
            </p>
          </div>
        </div>

        {/* Standard */}
        <div className="flex flex-col rounded-2xl border-2 border-brand-amber bg-white p-7 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-900">Standard</p>
              {period === 'monthly' ? (
                <p className="mt-2 text-3xl font-bold text-brand-navy">
                  £9.99 <span className="text-base font-normal text-gray-400">/month</span>
                </p>
              ) : (
                <p className="mt-2 text-3xl font-bold text-brand-navy">
                  £99.90 <span className="text-base font-normal text-gray-400">/year</span>
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-brand-amber px-2.5 py-1 text-xs font-semibold text-brand-navy">
              Verified
            </span>
          </div>
          <ul className="mt-6 flex-1 space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm font-medium text-brand-navy">
              <Tick amber />
              Everything in Free
            </li>
            {STANDARD_EXTRAS.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                <Tick amber />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <UpgradeButton
              tier="standard"
              period={period}
              label={period === 'monthly' ? 'Get Standard' : 'Get Standard annually'}
            />
          </div>
        </div>

        {/* Pro */}
        <div className="flex flex-col rounded-2xl bg-brand-navy p-7 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Pro</p>
              {period === 'monthly' ? (
                <p className="mt-2 text-3xl font-bold text-white">
                  £39.99 <span className="text-base font-normal text-white/50">/month</span>
                </p>
              ) : (
                <p className="mt-2 text-3xl font-bold text-white">
                  £399.90 <span className="text-base font-normal text-white/50">/year</span>
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-brand-amber px-2.5 py-1 text-xs font-semibold text-brand-navy">
              Pro
            </span>
          </div>
          <ul className="mt-6 flex-1 space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm font-medium text-white">
              <Tick amber />
              Everything in Standard
            </li>
            {PRO_EXTRAS.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                <Tick amber />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <UpgradeButton
              tier="pro"
              period={period}
              label={period === 'monthly' ? 'Get Pro' : 'Get Pro annually'}
              className="bg-brand-amber text-brand-navy hover:bg-amber-400"
            />
          </div>
        </div>

      </div>

      <p className="mt-8 text-center text-sm text-gray-400">
        You can upgrade or downgrade anytime from your account settings. No contracts.
      </p>
    </div>
  )
}

function Tick({ amber }: { amber?: boolean }) {
  return (
    <svg
      className={`mt-0.5 h-4 w-4 shrink-0 ${amber ? 'text-brand-amber' : 'text-green-500'}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}
