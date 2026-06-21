'use client'

import { useState, useTransition } from 'react'
import { createCheckoutSession, type CheckoutTier } from '@/actions/create-checkout-session'
import { createPortalSession } from '@/actions/manage-subscription'
import type { SubscriptionTier } from '@/types/database'

// ── Upgrade button ────────────────────────────────────────────

export function UpgradeButton({
  tier,
  label,
  className,
}: {
  tier: CheckoutTier
  label: string
  className: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createCheckoutSession(tier)
      if ('url' in result) {
        window.location.href = result.url
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`${className} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isPending ? 'Redirecting…' : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600 text-center">{error}</p>}
    </div>
  )
}

// ── Manage subscription button ────────────────────────────────

export function ManageButton({ currentTier }: { currentTier: SubscriptionTier }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createPortalSession()
      if ('url' in result) {
        window.location.href = result.url
      } else {
        setError(result.error)
      }
    })
  }

  const label = currentTier === 'pro' ? 'Pro' : 'Standard'

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-lg border-2 border-brand-navy px-4 py-3 text-base font-semibold text-brand-navy
          transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? 'Opening portal…' : `Manage ${label} subscription`}
      </button>
      {error && <p className="mt-2 text-xs text-red-600 text-center">{error}</p>}
    </div>
  )
}
