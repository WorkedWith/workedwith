'use client'

import { useState, useTransition } from 'react'
import { refundCardPayment } from '@/actions/cards'
import { Button, ErrorText, Input } from '@/components/ui'

export function CardRefundButton({ paymentId, max }: { paymentId: string; max: string }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(max)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="min-h-[40px] text-sm font-semibold text-brand-navy underline">Refund by card</button>
  return (
    <div className="w-full space-y-2 rounded-xl border border-gray-200 p-3">
      <p className="text-sm text-gray-700">The refund goes back to the client’s card through Stripe, and a credit note is issued.</p>
      <Input inputMode="decimal" aria-label="Amount to refund" value={amount} onChange={e => setAmount(e.target.value)} />
      <Button type="button" full disabled={pending} onClick={() => start(async () => {
        const r = await refundCardPayment(paymentId, amount)
        if (r.ok) window.location.reload()
        else setError(r.error)
      })}>Refund</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
