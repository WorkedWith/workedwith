import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Page not found | WorkedWith' }

export default function NotFound() {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4 text-center">
      <a href="/" className="text-2xl font-bold tracking-tight text-white">
        Worked<span className="text-brand-amber">With</span>
      </a>
      <p className="mt-10 text-6xl font-bold text-white/20">404</p>
      <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-3 text-sm text-white/60">
        The page you are looking for does not exist or has been moved.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex min-h-[44px] items-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
      >
        Back to home
      </a>
    </main>
  )
}
