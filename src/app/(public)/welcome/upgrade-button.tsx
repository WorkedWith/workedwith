'use client'

import { useState, useTransition } from 'react'
import { createCheckoutSession, type CheckoutTier, type CheckoutPeriod } from '@/actions/create-checkout-session'

export function UpgradeButton({
  tier,
  period,
  label,
  className,
}: {
  tier: CheckoutTier
  period: CheckoutPeriod
  label: string
  className?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createCheckoutSession(tier, period)
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
        className={`w-full rounded-lg py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
          className ?? 'bg-brand-amber text-brand-navy hover:bg-amber-400'
        }`}
      >
        {isPending ? 'Redirecting to checkout…' : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
