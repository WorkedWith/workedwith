'use client'

import { useState, useTransition } from 'react'
import { disconnectAccounting, retryFailedSyncs, startAccountingConnection } from '@/actions/accounting'
import { Button, ErrorText, Pill } from '@/components/ui'
import type { AccountingPlatform } from '@/types/v42'

const OPTIONS: { v: AccountingPlatform; l: string }[] = [
  { v: 'xero', l: 'Xero' },
  { v: 'quickbooks', l: 'QuickBooks' },
  { v: 'freeagent', l: 'FreeAgent' },
  { v: 'sage', l: 'Sage' },
]

type Props = {
  connection: { platform: AccountingPlatform; label: string; orgName: string | null; status: string } | null
  counts: { pending: number; synced: number; failed: number }
  failures: { id: string; what: string; error: string | null }[]
  mock: boolean
}

export function AccountingCard({ connection, counts, failures, mock }: Props) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const go = (p: AccountingPlatform) => start(async () => {
    setError(null)
    const r = await startAccountingConnection(p)
    if (r.ok && r.data) window.location.href = r.data.url
    else if (!r.ok) setError(r.error)
  })
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => {
    setError(null)
    const r = await fn()
    if (r.ok) window.location.reload()
    else setError(r.error ?? 'Something went wrong.')
  })

  if (!connection || connection.status === 'setup') {
    return (
      <div className="space-y-3">
        {connection?.status === 'setup' && <a href="/profile/getting-paid/accounting-setup" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-navy underline">Finish setting up {connection.label}</a>}
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map(o => <Button key={o.v} type="button" variant="outline" disabled={pending} onClick={() => go(o.v)}>{o.l}</Button>)}
        </div>
        <p className="text-xs text-gray-500">One way only: we send invoices, payments and credit notes. We never read, change or delete anything else.{mock ? ' Test mode: no real accounts are used.' : ''}</p>
        <ErrorText>{error}</ErrorText>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={connection.status === 'connected' ? 'green' : 'red'}>{connection.status === 'connected' ? 'Connected' : connection.status === 'expired' ? 'Needs reconnecting' : 'Problem'}</Pill>
        <span className="text-sm text-gray-700">{connection.label}{connection.orgName ? `, ${connection.orgName}` : ''}</span>
      </div>
      <p className="text-sm text-gray-600">{counts.synced} sent{counts.pending ? `, ${counts.pending} waiting` : ''}{counts.failed ? `, ${counts.failed} failed` : ''}.</p>
      {failures.length > 0 && (
        <div className="space-y-2 rounded-xl bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">These could not be sent. Your jobs and payments are not affected.</p>
          <ul className="space-y-1 text-sm text-red-800">{failures.map(f => <li key={f.id}>{f.what}: {f.error}</li>)}</ul>
          <Button type="button" variant="outline" disabled={pending} onClick={() => act(retryFailedSyncs)}>Retry now</Button>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {connection.status !== 'connected' && <Button type="button" disabled={pending} onClick={() => go(connection.platform)}>Reconnect</Button>}
        <a href="/profile/getting-paid/accounting-setup" className="inline-flex min-h-[48px] items-center rounded-xl px-4 text-sm font-semibold text-brand-navy underline">Change accounts</a>
        <Button type="button" variant="danger" disabled={pending} onClick={() => { if (window.confirm('Disconnect? Nothing already sent is deleted.')) act(disconnectAccounting) }}>Disconnect</Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
