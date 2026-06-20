'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isResetting, startResetting] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError('Email or password is incorrect.')
        return
      }

      // Determine redirect based on user_type and verification_tier
      const { data: { user: authedUser } } = await supabase.auth.getUser()
      if (authedUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('user_type, verification_tier, phone_verified')
          .eq('id', authedUser.id)
          .maybeSingle()

        if (!userData || !userData.phone_verified || userData.verification_tier === 'unverified') {
          window.location.href = '/verify/phone'
        } else if (userData.user_type === 'client_business') {
          window.location.href = '/org/dashboard'
        } else {
          window.location.href = '/dashboard'
        }
      } else {
        window.location.href = '/verify/phone'
      }
    })
  }

  function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email address above first.')
      return
    }
    setError(null)

    startResetting(async () => {
      const supabase = createClient()
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      })
      setResetSent(true)
    })
  }

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Sign in to your WorkedWith account.
          </p>
        </div>

        {resetSent ? (
          <div className="rounded-2xl bg-green-900/40 border border-green-500/30 px-6 py-5 text-center">
            <p className="text-sm font-medium text-green-300">
              Password reset email sent
            </p>
            <p className="mt-1 text-sm text-green-400/70">
              Check your inbox for a link to reset your password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full min-h-[48px] rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/30 focus:border-brand-amber focus:bg-white/15 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-white/80">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-xs text-white/40 hover:text-brand-amber transition-colors disabled:opacity-40 min-h-[44px] flex items-center"
                >
                  {isResetting ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full min-h-[48px] rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/30 focus:border-brand-amber focus:bg-white/15 focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-900/40 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full min-h-[52px] rounded-xl bg-brand-amber px-6 text-base font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50 transition-colors mt-2"
            >
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-white/50">
            Don&apos;t have an account?
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/join/trade" className="text-sm font-medium text-brand-amber hover:underline">
              Join as Tradesperson
            </a>
            <span className="text-white/20">·</span>
            <a href="/join/client" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              Join as Client
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
