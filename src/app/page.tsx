import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "WorkedWith — Know who you're working with",
  description: 'The only platform where both tradespeople and clients have a reputation to protect.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-brand-navy flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-5">
        <a href="/" className="text-xl font-bold tracking-tight text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <a
          href="/sign-in"
          className="min-h-[44px] flex items-center rounded-lg border border-white/20 px-4 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
        >
          Sign in
        </a>
      </div>

      {/* ── Centre content ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6">
        {/* Dot-grid background */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" fillOpacity="0.08" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        <div className="relative w-full max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-amber mb-6">
            WorkedWith
          </p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl text-balance leading-[1.1]">
            Know who you&apos;re working with.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/60 text-balance sm:text-lg">
            The only platform where both tradespeople and clients have a reputation to protect.
          </p>

          {/* Audience cards */}
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Tradesperson card */}
            <a
              href="/for-trades"
              className="group flex flex-col items-start rounded-2xl border-2 border-white/20 bg-white p-8 text-left hover:border-brand-amber transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <HardHatIcon />
              </div>
              <h2 className="mt-5 text-xl font-bold text-brand-navy">I&apos;m a tradesperson</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 flex-1">
                Build your verified reputation, vet clients before you commit, and grow your business with trust.
              </p>
              <span className="mt-6 w-full rounded-xl bg-brand-amber py-3 text-center text-sm font-semibold text-brand-navy group-hover:bg-amber-400 transition-colors">
                Get started
              </span>
            </a>

            {/* Client card */}
            <a
              href="/for-clients"
              className="group flex flex-col items-start rounded-2xl bg-brand-amber p-8 text-left hover:bg-amber-400 transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy/10">
                <SearchIcon />
              </div>
              <h2 className="mt-5 text-xl font-bold text-brand-navy">I&apos;m looking for a tradesperson</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-navy/70 flex-1">
                Find verified tradespeople in your area with genuine mutual reviews from real jobs.
              </p>
              <span className="mt-6 w-full rounded-xl bg-brand-navy py-3 text-center text-sm font-semibold text-white group-hover:bg-brand-navy/90 transition-colors">
                Find a tradesperson
              </span>
            </a>

          </div>

          {/* Sign-in nudge */}
          <p className="mt-8 text-sm text-white/40">
            Already have an account?{' '}
            <a href="/sign-in" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>

      {/* ── Footer strip ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} WorkedWith
        </p>
        <div className="flex gap-5">
          <a href="/terms" className="text-xs text-white/40 hover:text-white/70 transition-colors">Terms</a>
          <a href="/privacy" className="text-xs text-white/40 hover:text-white/70 transition-colors">Privacy</a>
        </div>
      </div>

    </div>
  )
}

function HardHatIcon() {
  return (
    <svg className="h-6 w-6 text-brand-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="h-6 w-6 text-brand-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
