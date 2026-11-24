'use client'

import { useState, useTransition } from 'react'
import { simulateBankTransfer } from '@/actions/getting-paid'
import { Button, Card, ErrorText, Input, Label } from '@/components/ui'

const OUTCOME: Record<string, string> = {
  matched: 'Matched. The invoice is marked paid and the client gets a receipt.',
  part_payment: 'Recorded as a part payment.',
  overpayment: 'Recorded, and flagged to you as an overpayment.',
  suggested: 'Probable match. You will be asked to confirm it.',
  ignored: 'No match. Ignored and not stored.',
  duplicate: 'Already seen.',
}

/** Test mode only. */
export function SimulateTransfer() {
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [payer, setPayer] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <Card className="border-dashed">
      <h2 className="text-base font-bold text-brand-navy">Simulate a bank transfer (test mode)</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div><Label htmlFor="sa">Amount</Label><Input id="sa" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1200" /></div>
        <div><Label htmlFor="sr">Reference</Label><Input id="sr" value={reference} onChange={e => setReference(e.target.value)} placeholder="BLC 0014" /></div>
        <div><Label htmlFor="sp">Payer name</Label><Input id="sp" value={payer} onChange={e => setPayer(e.target.value)} placeholder="S MILLER" /></div>
      </div>
      <Button type="button" className="mt-3" variant="outline" disabled={pending} onClick={() => {
        setError(null); setMsg(null)
        start(async () => {
          const r = await simulateBankTransfer({ amount, reference, payerName: payer })
          if (r.ok) setMsg(OUTCOME[r.data?.outcome ?? 'ignored'])
          else setError(r.error)
        })
      }}>Send test transfer</Button>
      {msg && <p className="mt-2 text-sm text-green-700">{msg}</p>}
      <ErrorText>{error}</ErrorText>
    </Card>
  )
}
