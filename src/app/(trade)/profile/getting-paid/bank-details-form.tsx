'use client'

import { useState, useTransition } from 'react'
import { saveBankDetails } from '@/actions/getting-paid'
import { Button, ErrorText, Input, Label, Notice } from '@/components/ui'

type Props = { initial: { accountName: string; sortCode: string; last4: string } | null; onSaved?: () => void }

const COP_COPY: Record<string, { tone: 'green' | 'amber' | 'red' | 'blue'; text: (name: string | null) => string }> = {
  match: { tone: 'green', text: () => 'Name checked with your bank. It matches.' },
  close_match: { tone: 'amber', text: n => `Your bank holds a slightly different name${n ? `: ${n}` : ''}. Clients may see a warning when they pay. Check the name and save again.` },
  no_match: { tone: 'red', text: () => 'The name does not match what your bank holds. Clients will see a warning when they pay, so please check it.' },
  unavailable: { tone: 'blue', text: () => 'Saved. We could not check the name with your bank this time.' },
}

export function BankDetailsForm({ initial }: Props) {
  const [editing, setEditing] = useState(!initial)
  const [accountName, setAccountName] = useState(initial?.accountName ?? '')
  const [sortCode, setSortCode] = useState(initial?.sortCode ?? '')
  const [accountNumber, setAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cop, setCop] = useState<{ result: string; name: string | null } | null>(null)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const r = await saveBankDetails({ accountName, sortCode, accountNumber })
      if (!r.ok) return setError(r.error)
      setCop({ result: r.data?.cop ?? 'unavailable', name: r.data?.copName ?? null })
      setEditing(false)
      setAccountNumber('')
    })
  }

  if (!editing && initial) {
    return (
      <div className="space-y-3">
        {cop && <Notice tone={COP_COPY[cop.result].tone}>{COP_COPY[cop.result].text(cop.name)}</Notice>}
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>Change bank details</Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="acc-name" hint="Exactly as your bank shows it, so clients don't see a name warning.">Name on the account</Label>
        <Input id="acc-name" value={accountName} onChange={e => setAccountName(e.target.value)} autoComplete="off" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sort">Sort code</Label>
          <Input id="sort" inputMode="numeric" placeholder="12 34 56" value={sortCode} onChange={e => setSortCode(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="acc-no" hint={initial ? `Currently ending ${initial.last4}` : undefined}>Account number</Label>
          <Input id="acc-no" inputMode="numeric" placeholder="8 numbers" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} autoComplete="off" required />
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={pending}>{pending ? 'Checking with your bank…' : 'Save bank details'}</Button>
        {initial && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>
      <p className="text-xs text-gray-500">Your account number is stored encrypted and is only shown to clients on your invoices.</p>
    </form>
  )
}
