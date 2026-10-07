'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4 text-center">
      <a href="/" className="text-2xl font-bold tracking-tight text-white">
        Worked<span className="text-brand-amber">With</span>
      </a>
      <h1 className="mt-10 text-2xl font-bold text-white">Something went wrong</h1>
      <p className="mt-3 text-sm text-white/60">
        An unexpected error occurred. Please try again or contact{' '}
        <a href="mailto:hello@workedwith.co.uk" className="text-brand-amber hover:underline">
          hello@workedwith.co.uk
        </a>{' '}
        if the problem continues.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-6 text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          Back to home
        </a>
      </div>
    </main>
  )
}
