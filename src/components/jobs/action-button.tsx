'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Button, ErrorText } from '@/components/ui'

type Result = { ok: boolean; error?: string }

/** A button that runs one server action, with optional confirm text, then reloads the page. */
export function ActionButton({ action, children, variant = 'primary', confirm, full, done }: {
  action: () => Promise<Result>
  children: ReactNode
  variant?: 'primary' | 'navy' | 'outline' | 'ghost' | 'danger'
  confirm?: string
  full?: boolean
  done?: string
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  return (
    <div className={full ? 'w-full' : undefined}>
      <Button type="button" variant={variant} full={full} disabled={pending} onClick={() => {
        if (confirm && !window.confirm(confirm)) return
        setError(null)
        start(async () => {
          const r = await action()
          if (!r.ok) setError(r.error ?? 'Something went wrong.')
          else if (done) setOk(true)
          else window.location.reload()
        })
      }}>
        {pending ? 'Working…' : children}
      </Button>
      {ok && done && <p className="mt-1 text-sm text-green-700">{done}</p>}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
