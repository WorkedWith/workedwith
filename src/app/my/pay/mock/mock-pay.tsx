'use client'

import { useTransition, useState } from 'react'
import { mockCardPay } from '@/actions/cards'
import { Button, ErrorText } from '@/components/ui'

export function MockPay({ stageId, amountPence, label }: { stageId: string; amountPence: number; label: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <>
      <Button type="button" full disabled={pending} onClick={() => start(async () => {
        const r = await mockCardPay(stageId, amountPence)
        if (r.ok && r.data) window.location.href = `/my/jobs/${r.data.jobId}?card=paid`
        else if (!r.ok) setError(r.error)
      })}>{pending ? 'Paying…' : `Pay ${label} with a test card`}</Button>
      <ErrorText>{error}</ErrorText>
    </>
  )
}
