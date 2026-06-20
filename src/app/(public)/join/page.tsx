import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join WorkedWith',
}

export default function JoinPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  const next = searchParams.next && searchParams.next.startsWith('/')
    ? searchParams.next
    : undefined

  const tradeHref = next ? `/join/trade?next=${encodeURIComponent(next)}` : '/join/trade'
  const clientHref = next ? `/join/client?next=${encodeURIComponent(next)}` : '/join/client'
  const signInHref = next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in'

  return (
    <div className="min-h-screen bg-white">
      <header className="px-4 py-6 text-center sm:px-6">
        <a href="/" className="text-2xl font-bold tracking-tight text-brand-navy">
          Worked<span className="text-brand-amber">With</span>
        </a>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6">
        <h1 className="text-center text-3xl font-bold text-brand-navy sm:text-4xl">
          What brings you to WorkedWith?
        </h1>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {/* Tradesperson card */}
          <a
            href={tradeHref}
            className="group flex flex-col rounded-2xl bg-brand-navy p-8 hover:opacity-95 transition-opacity"
          >
            <h2 className="text-2xl font-bold text-white">I&apos;m a tradesperson</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-white/70">
              Build your verified work history, vet clients before you commit, and grow your reputation.
            </p>
            <span className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy group-hover:bg-amber-400 transition-colors">
              Join as a tradesperson
            </span>
          </a>

          {/* Client card */}
          <a
            href={clientHref}
            className="group flex flex-col rounded-2xl border border-amber-100 bg-amber-50 p-8 hover:bg-amber-100/60 transition-colors"
          >
            <h2 className="text-2xl font-bold text-brand-navy">I&apos;m a client</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">
              Find verified tradespeople and build a reputation that gets you the best trades wanting to work with you.
            </p>
            <span className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-brand-navy px-6 text-sm font-semibold text-white group-hover:bg-brand-navy/90 transition-colors">
              Join as a client
            </span>
          </a>
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <a href={signInHref} className="font-medium text-gray-600 hover:text-brand-navy transition-colors">
            Sign in
          </a>
        </p>
      </main>
    </div>
  )
}
