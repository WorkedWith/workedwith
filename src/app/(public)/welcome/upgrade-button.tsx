'use client'

import { useState, useTransition } from 'react'
import { createCheckoutSession, type CheckoutTier } from '@/actions/create-checkout-session'

export function UpgradeButton({ tier, label }: { tier: CheckoutTier; label: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createCheckoutSession(tier, '/dashboard')
      if ('url' in result) {
        window.location.href = result.url
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="mt-8">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-lg bg-brand-amber py-3 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Redirecting to checkout…' : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
