'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Email magic link for existing accounts (PRD 5: later visits use a text code or an email link). */
export function EmailLinkButton({ email, next }: { email: string; next: string | null }) {
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle')
  const [pending, start] = useTransition()

  function send() {
    if (!email.trim()) {
      setState('error')
      return
    }
    start(async () => {
      const supabase = createClient()
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? '/dashboard')}`
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: redirect } })
      setState(error ? 'error' : 'sent')
    })
  }

  return (
    <div>
      <button type="button" onClick={send} disabled={pending} className="min-h-[44px] w-full text-sm text-white/70 underline hover:text-white disabled:opacity-50">
        {pending ? 'Sending…' : 'Email me a sign in link instead'}
      </button>
      {state === 'sent' && <p className="text-center text-sm text-green-300">If that email has an account, a sign in link is on its way.</p>}
      {state === 'error' && <p className="text-center text-sm text-red-300">Enter your email address above first.</p>}
    </div>
  )
}
