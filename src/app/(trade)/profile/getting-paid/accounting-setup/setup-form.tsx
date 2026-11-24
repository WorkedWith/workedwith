'use client'

import { useState, useTransition } from 'react'
import { finishAccountingSetup } from '@/actions/accounting'
import { Button, ErrorText, Label, Select } from '@/components/ui'

type Opt = { id: string; code: string | null; name: string }

export function AccountingSetupForm({ sales, bank, defaultSales, defaultBank, vatRegistered }: { sales: Opt[]; bank: Opt[]; defaultSales: string | null; defaultBank: string | null; vatRegistered: boolean }) {
  const [s, setS] = useState(defaultSales ?? sales[0]?.id ?? '')
  const [b, setB] = useState(defaultBank ?? bank[0]?.id ?? '')
  const [vat, setVat] = useState('standard')
  const [from, setFrom] = useState<'today' | 'existing'>('today')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const label = (o: Opt) => (o.code ? `${o.code} ${o.name}` : o.name)
  return (
    <div className="space-y-4">
      <div><Label htmlFor="sa" hint="Where your invoices are recorded as income.">Sales account</Label>
        <Select id="sa" value={s} onChange={e => setS(e.target.value)}>{sales.map(o => <option key={o.id} value={o.id}>{label(o)}</option>)}</Select></div>
      <div><Label htmlFor="ba" hint="The account clients pay into. Payments are recorded against it.">Bank account</Label>
        <Select id="ba" value={b} onChange={e => setB(e.target.value)}>{bank.map(o => <option key={o.id} value={o.id}>{label(o)}</option>)}</Select></div>
      {vatRegistered && (
        <div><Label htmlFor="vr">VAT on your invoices</Label>
          <Select id="vr" value={vat} onChange={e => setVat(e.target.value)}>
            <option value="standard">20% standard rate</option>
            <option value="reverse_charge">Domestic reverse charge (construction)</option>
          </Select></div>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-800">What to send</legend>
        <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="radio" name="from" checked={from === 'today'} onChange={() => setFrom('today')} className="h-5 w-5" />Only from today</label>
        <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="radio" name="from" checked={from === 'existing'} onChange={() => setFrom('existing')} className="h-5 w-5" />Also send invoices already issued on WorkedWith</label>
      </fieldset>
      <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Your bank feed in your accounting software will also show each payment. Because we record the payment against the invoice, you reconcile it in one click. Don’t record it again.</p>
      <Button type="button" full disabled={pending} onClick={() => start(async () => {
        setError(null)
        const r = await finishAccountingSetup({ salesAccount: s, bankAccount: b, vatRate: vat, syncFrom: from })
        if (r.ok) window.location.href = '/profile/getting-paid?accounting=connected'
        else setError(r.error)
      })}>{pending ? 'Saving…' : 'Start syncing'}</Button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
