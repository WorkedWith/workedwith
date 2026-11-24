'use client'

import { useState } from 'react'
import { sendSignInCode, verifySignInCode } from '@/actions/client-access'
import { CodeEntry } from '@/components/code-entry'
import { Input, Label } from '@/components/ui'

export function CodeSignIn({ next, mock }: { next?: string; mock: boolean }) {
  const [mobile, setMobile] = useState('')
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="mob">Your mobile number</Label>
        <Input id="mob" type="tel" inputMode="tel" autoComplete="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="07700 900123" />
      </div>
      <CodeEntry
        onSend={() => sendSignInCode(mobile)}
        onVerify={code => verifySignInCode(mobile, code, next)}
        sendLabel="Text me a code"
        hint="If this number has a WorkedWith account, we'll text it a code."
        mockHint={mock}
      />
    </div>
  )
}
