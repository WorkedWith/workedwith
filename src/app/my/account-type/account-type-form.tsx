'use client'

import { useState, useTransition } from 'react'
import { confirmAccountType } from '@/actions/client-access'
import type { ClientKind } from '@/lib/clients/accounts'
import { Button, ErrorText, Input, Label } from '@/components/ui'

export function AccountTypeForm({ initial, initialCompany, next }: { initial: ClientKind; initialCompany: string; next: string }) {
  const [kind, setKind] = useState<ClientKind>(initial)
  const [company, setCompany] = useState(initialCompany)
  const [ch, setCh] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const r = await confirmAccountType({ kind, companyName: company, companiesHouseNumber: ch, next })
      if (r.ok) window.location.href = r.redirectTo ?? '/my/jobs'
      else setError(r.error)
    })
  }

  const option = (k: ClientKind, title: string, body: string) => (
    <label className={`flex min-h-[72px] cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${kind === k ? 'border-brand-amber bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <input type="radio" name="kind" className="mt-1 h-5 w-5" checked={kind === k} onChange={() => setKind(k)} />
      <span>
        <span className="block text-base font-semibold text-brand-navy">{title}</span>
        <span className="block text-sm text-gray-600">{body}</span>
      </span>
    </label>
  )

  return (
    <form onSubmit={submit} className="space-y-4">
      {option('person', 'For me, in my own name', 'Including sole traders. You get the fuller consumer protections, like the 14 day cancellation period.')}
      {option('company', 'For a company', 'A limited company or other business, for example a landlord acting through a company.')}
      {kind === 'company' && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
          <div><Label htmlFor="co">Company name</Label><Input id="co" value={company} onChange={e => setCompany(e.target.value)} required /></div>
          <div><Label htmlFor="ch" hint="Optional.">Companies House number</Label><Input id="ch" value={ch} onChange={e => setCh(e.target.value)} /></div>
          <p className="text-xs text-gray-500">You are still the named contact, and you make every approval from your own mobile.</p>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <Button type="submit" full disabled={pending}>{pending ? 'Saving…' : 'Continue'}</Button>
    </form>
  )
}
