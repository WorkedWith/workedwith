'use client'

import { useState, useTransition } from 'react'
import { createCheckoutSession } from '@/actions/create-checkout-session'
import { createPortalSession } from '@/actions/manage-subscription'

function useRedirectAction(action: () => Promise<{ url: string } | { error: string }>) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function run() {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if ('url' in result) window.location.href = result.url
      else setError(result.error)
    })
  }
  return { isPending, error, run }
}

export function AddCardButton({ label = 'Add a card' }: { label?: string }) {
  const { isPending, error, run } = useRedirectAction(createCheckoutSession)
  return (
    <div>
      <button
        onClick={run}
        disabled={isPending}
        className="min-h-[48px] w-full rounded-xl bg-brand-amber px-4 text-base font-semibold text-brand-navy hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {isPending ? 'Opening Stripe…' : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function ManageButton() {
  const { isPending, error, run } = useRedirectAction(createPortalSession)
  return (
    <div>
      <button
        onClick={run}
        disabled={isPending}
        className="min-h-[48px] w-full rounded-xl border-2 border-brand-navy px-4 text-base font-semibold text-brand-navy hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {isPending ? 'Opening Stripe…' : 'Manage billing'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
