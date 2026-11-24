'use client'

import { useState, useTransition } from 'react'
import { markRefunded } from '@/actions/stages'
import { Button, ErrorText, Input } from '@/components/ui'

export function RefundButton({ paymentId, max }: { paymentId: string; max: string }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(max)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="min-h-[40px] text-sm font-semibold text-brand-navy underline">Mark refunded</button>
  return (
    <div className="w-full space-y-2 rounded-xl border border-gray-200 p-3">
      <p className="text-sm text-gray-700">Send the refund from your own bank first, then record it here. The client is asked to confirm, and a credit note is issued.</p>
      <Input inputMode="decimal" aria-label="Amount refunded" value={amount} onChange={e => setAmount(e.target.value)} />
      <Button type="button" full disabled={pending} onClick={() => start(async () => {
        const r = await markRefunded(paymentId, amount)
        if (r.ok) window.location.reload()
        else setError(r.error)
      })}>Record refund</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
