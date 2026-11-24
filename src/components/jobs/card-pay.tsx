'use client'

import { useState, useTransition } from 'react'
import { startCardPayment } from '@/actions/cards'
import { Button, ErrorText, Input } from '@/components/ui'

export function CardPay({ stageId, balance, limitText, allowPart }: { stageId: string; balance: string; limitText: string | null; allowPart: boolean }) {
  const [amount, setAmount] = useState(balance)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="mt-3 space-y-2">
      {allowPart && <Input inputMode="decimal" aria-label="Amount to pay by card" value={amount} onChange={e => setAmount(e.target.value)} />}
      <Button type="button" full variant="navy" disabled={pending} onClick={() => start(async () => {
        setError(null)
        const r = await startCardPayment(stageId, amount)
        if (r.ok && r.data) window.location.href = r.data.url
        else if (!r.ok) setError(r.error)
      })}>{pending ? 'Opening…' : 'Pay by card, Apple Pay or Google Pay'}</Button>
      {limitText && <p className="text-xs text-gray-500">{limitText}</p>}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
