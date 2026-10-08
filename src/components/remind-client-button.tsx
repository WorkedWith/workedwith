'use client'

import { useState, useTransition } from 'react'
import { remindClient } from '@/actions/remind-client'

export function RemindClientButton({ jobId, canEmail }: { jobId: string; canEmail: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  if (!canEmail) return null

  function send() {
    setMessage(null)
    startTransition(async () => {
      const res = await remindClient(jobId)
      setMessage(res.success
        ? { ok: true, text: 'Reminder sent. We will not send more than two.' }
        : { ok: false, text: res.error })
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={send}
        disabled={isPending}
        className="min-h-[44px] w-full rounded-xl border-2 border-brand-navy px-4 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white disabled:opacity-50"
      >
        {isPending ? 'Sending...' : 'Email them a reminder'}
      </button>
      {message && (
        <p className={`mt-2 text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
    </div>
  )
}
