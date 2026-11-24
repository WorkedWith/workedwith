'use client'

import { useState, useTransition } from 'react'
import { setCardLimit, setCardsEnabled, startCardSetup } from '@/actions/cards'
import { Button, ErrorText, Input, Label, Pill } from '@/components/ui'

export function CardsControls({ account, mock }: { account: { charges: boolean; enabled: boolean; limit: string } | null; mock: boolean }) {
  const [limit, setLimit] = useState(account?.limit ?? '1000')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; data?: { url: string } }>) => start(async () => {
    setError(null)
    const r = await fn()
    if (!r.ok) setError(r.error ?? 'Something went wrong.')
    else if (r.data?.url) window.location.href = r.data.url
    else window.location.reload()
  })
  if (!account || !account.charges) {
    return (
      <div className="space-y-3">
        <ul className="space-y-1 text-sm text-gray-700">
          <li>✓ Clients pay by card, Apple Pay or Google Pay into your own Stripe account</li>
          <li>✓ Stripe charges its fee to you directly (currently 1.5% + 20p for standard UK cards). WorkedWith takes nothing</li>
          <li>✓ The price is the same whichever way the client pays</li>
        </ul>
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(startCardSetup)}>{account ? 'Finish setting up Stripe' : 'Set up card payments with Stripe'}</Button>
        {mock && <p className="text-xs text-gray-400">Test mode: Stripe is simulated.</p>}
        <ErrorText>{error}</ErrorText>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Pill tone={account.enabled ? 'green' : 'grey'}>{account.enabled ? 'Cards on' : 'Cards off'}</Pill><span className="text-sm text-gray-600">Stripe account connected</span></div>
      <Button type="button" variant={account.enabled ? 'outline' : 'primary'} disabled={pending} onClick={() => run(() => setCardsEnabled(!account.enabled))}>{account.enabled ? 'Switch cards off' : 'Switch cards on'}</Button>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1"><Label htmlFor="cl" hint="Above this, clients see bank transfer only.">Card limit per payment (£)</Label><Input id="cl" inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value)} /></div>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => setCardLimit(limit))}>Save limit</Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
