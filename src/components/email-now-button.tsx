'use client'

import { useState, useTransition } from 'react'
import { emailNowTap } from '@/actions/email-now'

/**
 * Email now (PRD 15): opens the visitor's email app addressed to the business email, with the subject
 * "Quote request via WorkedWith" and a short starter line. The address is fetched and put together in the
 * browser on tap, then shown as text so it can be copied.
 */
export function EmailNowButton({ tradeProfileId, seededProfileId, businessName, profileUrl, className }: {
  tradeProfileId?: string
  seededProfileId?: string
  businessName: string
  profileUrl: string
  className?: string
}) {
  const [address, setAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function open(addr: string) {
    const subject = 'Quote request via WorkedWith'
    const body = `Hello ${businessName},\n\nI found you on WorkedWith (${profileUrl}) and would like a quote.\n\nThe job:\nMy postcode:\nWhen I need it done:\n\nThanks`
    window.location.href = `mailto:${addr}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (address) return open(address)
          setError(null)
          start(async () => {
            const r = await emailNowTap({ tradeProfileId, seededProfileId })
            if (!r.ok) return setError(r.error)
            const addr = [r.user, r.domain].join('@')
            setAddress(addr)
            open(addr)
          })
        }}
        className={className ?? 'inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-amber px-4 text-[15px] font-bold text-brand-navy hover:bg-amber-400'}
      >
        {pending ? 'Opening…' : 'Email now'}
      </button>
      {address && <p className="mt-1 select-all break-all text-center text-xs text-gray-600">{address}</p>}
      {error && <p className="mt-1 text-center text-xs text-red-600">{error}</p>}
    </div>
  )
}
