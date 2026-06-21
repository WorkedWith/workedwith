import type { Metadata } from 'next'
import { PricingCards } from './pricing-cards'

export const metadata: Metadata = {
  title: 'Pricing — WorkedWith',
  description: 'Simple, honest pricing. Free forever for tradespeople who want the basics. Standard and Pro for those who want more.',
}

const FAQS = [
  {
    q: 'Is there a free trial?',
    a: 'No. The Free tier is the trial — it is a permanent, fully functional product. You can use WorkedWith indefinitely on the Free tier and upgrade whenever the additional features are worth it to you.',
  },
  {
    q: 'Can I switch between monthly and annual billing?',
    a: 'Yes. You can switch from monthly to annual at any time from your account settings. The change takes effect at your next renewal date.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'Your subscription remains active until the end of your current billing period, then your account moves to Free automatically. No data is lost — your job history, reviews, and profile are all retained.',
  },
  {
    q: 'Do annual subscribers get price protection?',
    a: 'Yes. If prices change, annual subscribers retain their agreed rate for the duration of their current term. Monthly subscribers are notified before any price change takes effect on their renewal.',
  },
  {
    q: 'Do clients pay anything?',
    a: 'Never. Client accounts are permanently free on WorkedWith.',
  },
  {
    q: 'What makes a review verified?',
    a: 'A review is verified when both the tradesperson and the client have confirmed the job took place and both have submitted their reviews independently. Neither review is visible until both are submitted.',
  },
  {
    q: 'Is the free tier really unlimited?',
    a: 'Yes. There are no caps on jobs or reviews on the free tier. Standard and Pro unlock better client intelligence and visibility — not more usage.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight text-brand-navy">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/sign-in" className="min-h-[44px] flex items-center px-4 text-sm font-medium text-gray-600 hover:text-brand-navy transition-colors">
              Sign in
            </a>
            <a href="/join" className="min-h-[44px] flex items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors">
              Join free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-brand-navy px-4 py-20 sm:py-24 sm:px-6 text-center">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">Simple, honest pricing.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/60 leading-relaxed">
          Free forever for the basics. Standard for verified trust. Pro for maximum visibility.
        </p>
      </section>

      {/* ── Pricing cards (client — has toggle) ─────────────── */}
      <section className="px-4 py-16 sm:py-20 sm:px-6">
        <PricingCards />
      </section>

      {/* ── Client banner ────────────────────────────────────── */}
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl px-8 py-7 text-center bg-gray-50 border border-gray-100">
            <p className="text-base font-semibold text-brand-navy">
              Clients always join free. No subscription. No credit card. Ever.
            </p>
          </div>
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-brand-navy mb-10 text-center">Common questions</h2>
          <div className="space-y-8">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="border-t border-gray-100 pt-8 first:border-t-0 first:pt-0">
                <p className="font-semibold text-brand-navy">{q}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-brand-navy px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-bold text-white">Worked<span className="text-brand-amber">With</span></p>
            <p className="mt-1 text-sm text-white/40">Know who you are working with.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="/find" className="text-sm text-white/50 hover:text-white transition-colors">Find a tradesperson</a>
            <a href="/join/trade" className="text-sm text-white/50 hover:text-white transition-colors">Join as Trade</a>
            <a href="/join/client" className="text-sm text-white/50 hover:text-white transition-colors">Join as Client</a>
            <a href="/sign-in" className="text-sm text-white/50 hover:text-white transition-colors">Sign in</a>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-xs text-white/30">
          &copy; {new Date().getFullYear()} WorkedWith. All rights reserved. Registered in England &amp; Wales.
        </p>
      </footer>
    </div>
  )
}
