'use client'

import { useState, useTransition } from 'react'
import { remindTrade } from '@/actions/remind-trade'

export function RemindTradeButton({ inviteId, sent }: { inviteId: string; sent: number }) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string | null>(null)

  function go() {
    setNote(null)
    start(async () => {
      const r = await remindTrade(inviteId)
      setNote(r.success ? 'Reminder sent.' : r.error)
    })
  }
  return (
    <div className="mt-2">
      <button type="button" onClick={go} disabled={pending}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
        {pending ? 'Sending...' : sent === 0 ? 'Send a reminder' : 'Send another reminder'}
      </button>
      {note && <p className="mt-1 text-xs text-gray-500" role="status">{note}</p>}
    </div>
  )
}
