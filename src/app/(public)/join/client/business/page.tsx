'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function JoinClientBusinessPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (fullName.trim().split(' ').filter(Boolean).length < 2) {
      setError('Please enter your full name (first and last).')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/verify/phone`,
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      window.location.href = '/check-email'
    })
  }

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
            Join as a Business
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Commission trade work with confidence. Your company reputation matters here too.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-white/80 mb-1.5">
              Your full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full min-h-[48px] rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/30 focus:border-brand-amber focus:bg-white/15 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">
              Work email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.co.uk"
              className="w-full min-h-[48px] rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/30 focus:border-brand-amber focus:bg-white/15 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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
            {isPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-white/50">
          <a href="/join/client" className="hover:text-white transition-colors">← Back</a>
        </p>
        <p className="mt-2 text-center text-sm text-white/50">
          Already have an account?{' '}
          <a href="/sign-in" className="font-medium text-brand-amber hover:underline">Sign in</a>
        </p>
        <p className="mt-6 text-center text-xs text-white/30 leading-relaxed">
          By creating an account you agree to our terms of service and privacy policy.
        </p>
      </div>
    </main>
  )
}
