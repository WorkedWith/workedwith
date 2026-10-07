'use client'

import { useState, useTransition } from 'react'
import { sendTestEmail } from '@/actions/admin/send-test-email'

export function SendButton({ id }: { id: string }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sendTestEmail(id)
            setMsg(r.success ? `Sent to ${r.to}` : r.error)
          })
        }
        className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send to my inbox'}
      </button>
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  )
}
