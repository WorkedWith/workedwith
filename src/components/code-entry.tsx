'use client'

import { useState, useTransition } from 'react'
import { Button, ErrorText, Input, Label } from '@/components/ui'

type R = { ok: true; redirectTo?: string } | { ok: false; error: string }

/** Two step text code: send, then enter the 6 numbers. Phone first. */
export function CodeEntry({ onSend, onVerify, sendLabel, hint, mockHint }: {
  onSend: () => Promise<R>
  onVerify: (code: string) => Promise<R>
  sendLabel: string
  hint: string
  mockHint?: boolean
}) {
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function send() {
    setError(null)
    start(async () => {
      const r = await onSend()
      if (r.ok) setSent(true)
      else setError(r.error)
    })
  }
  function verify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const r = await onVerify(code)
      if (r.ok) window.location.href = r.redirectTo ?? '/dashboard'
      else setError(r.error)
    })
  }

  if (!sent) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">{hint}</p>
        <Button type="button" full onClick={send} disabled={pending}>{pending ? 'Sending…' : sendLabel}</Button>
        <ErrorText>{error}</ErrorText>
      </div>
    )
  }
  return (
    <form onSubmit={verify} className="space-y-3">
      <div>
        <Label htmlFor="otp">Enter the 6 number code</Label>
        <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus className="text-center text-2xl tracking-[0.4em]" />
      </div>
      {mockHint && <p className="text-xs text-gray-400">Test mode: the code is 123456.</p>}
      <Button type="submit" full disabled={pending || code.length !== 6}>{pending ? 'Checking…' : 'Continue'}</Button>
      <button type="button" onClick={send} disabled={pending} className="block min-h-[44px] w-full text-sm text-gray-500 underline">Send a new code</button>
      <ErrorText>{error}</ErrorText>
    </form>
  )
}
