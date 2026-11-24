'use client'

import { sendLinkCode, verifyLinkCode } from '@/actions/client-access'
import { CodeEntry } from '@/components/code-entry'

export function OpenLink({ token, masked, mock }: { token: string; masked: string; mock: boolean }) {
  return (
    <CodeEntry
      onSend={() => sendLinkCode(token)}
      onVerify={code => verifyLinkCode(token, code)}
      sendLabel="Text me a code"
      hint={`To keep your account safe, we'll text a code to ${masked}. No password needed.`}
      mockHint={mock}
    />
  )
}
