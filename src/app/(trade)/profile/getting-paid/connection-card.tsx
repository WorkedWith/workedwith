'use client'

import { useState, useTransition } from 'react'
import { disconnectBank, markBankUnsupported, startBankConnection } from '@/actions/getting-paid'
import { Button, ErrorText, Pill } from '@/components/ui'
import type { BankConnectionStatus } from '@/types/v42'

type Props = {
  hasBankDetails: boolean
  status: BankConnectionStatus
  bankName: string | null
  consentExpiresAt: string | null
}

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

const LABEL: Record<BankConnectionStatus, { text: string; tone: 'green' | 'amber' | 'red' | 'grey' }> = {
  connected: { text: 'Connected', tone: 'green' },
  needs_reconfirm: { text: 'Reconfirm soon', tone: 'amber' },
  lapsed: { text: 'Lapsed', tone: 'red' },
  unsupported: { text: 'Not connected', tone: 'grey' },
  not_connected: { text: 'Not connected', tone: 'grey' },
}

export function ConnectionCard({ hasBankDetails, status, bankName, consentExpiresAt }: Props) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function connect() {
    setError(null)
    start(async () => {
      const r = await startBankConnection()
      if (r.ok && r.data) window.location.href = r.data.url
      else if (!r.ok) setError(r.error)
    })
  }
  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    start(async () => {
      const r = await fn()
      if (!r.ok) setError(r.error ?? 'Something went wrong.')
    })
  }

  const live = status === 'connected' || status === 'needs_reconfirm'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={LABEL[status].tone}>{LABEL[status].text}</Pill>
        {live && bankName && <span className="text-sm text-gray-600">{bankName}, reconfirm by {fmt(consentExpiresAt)}</span>}
      </div>

      {!live && (
        <ul className="space-y-1.5 text-sm text-gray-700">
          <li>✓ Invoices mark themselves paid when the money arrives</li>
          <li>✓ Reads incoming payments only. It can never move money</li>
          <li>✓ Free. WorkedWith pays for it</li>
          <li>✓ Takes about a minute: pick your bank and approve in your banking app</li>
        </ul>
      )}

      {status === 'lapsed' && <p className="text-sm text-red-700">Automatic matching is paused. You can still mark payments yourself.</p>}
      {status === 'unsupported' && <p className="text-sm text-gray-600">Everything still works: mark payments as received from each job.</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!live && (
          <Button type="button" onClick={connect} disabled={pending || !hasBankDetails}>
            {pending ? 'Opening your bank…' : status === 'lapsed' ? 'Reconnect my bank' : 'Connect my bank'}
          </Button>
        )}
        {status === 'needs_reconfirm' && <Button type="button" onClick={connect} disabled={pending}>Reconfirm in one tap</Button>}
        {live && <Button type="button" variant="danger" onClick={() => act(disconnectBank)} disabled={pending}>Disconnect</Button>}
        {status === 'not_connected' && hasBankDetails && (
          <Button type="button" variant="ghost" onClick={() => act(markBankUnsupported)} disabled={pending}>My bank isn&apos;t listed, or I&apos;d rather not</Button>
        )}
      </div>
      {!hasBankDetails && <p className="text-xs text-gray-500">Add your bank details first.</p>}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
