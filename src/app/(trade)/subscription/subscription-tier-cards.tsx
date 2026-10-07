'use client'

import { useState } from 'react'
import { UpgradeButton, ManageButton, DowngradeButton } from './subscription-buttons'
import type { BillingPeriod, SubscriptionTier } from '@/types/database'

type Props = {
  currentTier: SubscriptionTier
  currentBillingPeriod: BillingPeriod
}

export function SubscriptionTierCards({ currentTier }: Props) {
  // Annual billing is deferred (PRD v3.5): new subscriptions are monthly only.
  const [period] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-brand-navy">Plans</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">

        {/* Free */}
        <TierCard
          name="Free"
          price="£0"
          priceSuffix="forever"
          description="Everything you need to build a verified reputation."
          highlight={currentTier === 'free'}
          isCurrent={currentTier === 'free'}
          cta={currentTier === 'free' ? null : <DowngradeButton label="Downgrade to Free" />}
        />

        {/* Standard */}
        <TierCard
          name="Standard"
          price={period === 'monthly' ? '£9.99' : '£99.90'}
          priceSuffix={period === 'monthly' ? 'per month' : 'per year'}
          description="Full client lookup, verified badge, and featured job images."
          highlight={currentTier === 'standard'}
          isCurrent={currentTier === 'standard'}
          cta={
            currentTier === 'free' ? (
              <UpgradeButton
                tier="standard"
                period={period}
                label="Choose Standard"
                className="w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy transition-opacity hover:opacity-90"
              />
            ) : currentTier === 'pro' ? (
              <DowngradeButton label="Downgrade to Standard" />
            ) : (
              <ManageButton currentTier="standard" />
            )
          }
        />

        {/* Pro */}
        <TierCard
          name="Pro"
          price={period === 'monthly' ? '£39.99' : '£399.90'}
          priceSuffix={period === 'monthly' ? 'per month' : 'per year'}
          description="Top search placement, analytics, and priority support."
          highlight={currentTier === 'pro'}
          isCurrent={currentTier === 'pro'}
          cta={
            currentTier === 'pro' ? (
              <ManageButton currentTier="pro" />
            ) : currentTier === 'standard' ? (
              <UpgradeButton
                tier="pro"
                period={period}
                label="Upgrade to Pro"
                className="w-full rounded-lg bg-brand-navy px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
              />
            ) : (
              <UpgradeButton
                tier="pro"
                period={period}
                label="Choose Pro"
                className="w-full rounded-lg bg-brand-navy px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
              />
            )
          }
        />

      </div>

      {currentTier !== 'free' && (
        <p className="mt-4 text-sm text-gray-500">
          Downgrading opens a secure Stripe page. Your plan stays as it is until the end of the
          period you have paid for, then moves to the lower plan.
          {currentTier === 'pro' && ' Moving off Pro ends your Boosted Districts at that point.'}
        </p>
      )}

    </div>
  )
}

function TierCard({
  name, price, priceSuffix, description, highlight, isCurrent, cta,
}: {
  name: string
  price: string
  priceSuffix: string
  description: string
  highlight: boolean
  isCurrent: boolean
  cta: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border-2 p-5 flex flex-col gap-4 ${
      highlight ? 'border-brand-amber bg-amber-50' : 'border-gray-200 bg-white'
    }`}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-bold text-brand-navy">{name}</p>
          {isCurrent && (
            <span className="inline-flex items-center rounded-full bg-brand-navy px-2 py-0.5 text-xs font-semibold text-white">
              Current
            </span>
          )}
        </div>
        <p className="mt-1">
          <span className="text-2xl font-bold text-brand-navy">{price}</span>
          <span className="text-sm text-gray-500"> {priceSuffix}</span>
        </p>
        <p className="mt-2 text-sm text-gray-600 leading-snug">{description}</p>
      </div>
      {cta && <div className="mt-auto">{cta}</div>}
    </div>
  )
}
