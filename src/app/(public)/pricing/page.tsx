import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — WorkedWith',
  description: 'Simple, honest pricing. Free forever for tradespeople who want the basics. Pro for those who want the full picture.',
}

const FREE_FEATURES = [
  'Unlimited job logging',
  'Unlimited reviews received and submitted',
  'Blind review submission',
  'Add past jobs to build your profile from day one',
  'Basic client lookup (overall rating only)',
  'Public profile page at workedwith.co.uk/t/your-name',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Full client profile on lookup (payment reliability, red flag history, written review excerpts)',
  'Your profile appears in client search results',
  'Verified badge on your public profile',
  'Respond publicly to client reviews',
]

const FAQS = [
  {
    q: 'Can I cancel Pro at any time?',
    a: 'Yes. Cancel from your account settings whenever you like. No contracts, no fees.',
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
    q: 'Why can I not find a tradesperson on the free tier?',
    a: 'Tradespeople choose whether to appear in search results. Only Pro members are listed. Free members can still share their profile link directly.',
  },
  {
    q: 'Is the free tier really unlimited?',
    a: 'Yes. There are no caps on jobs or reviews on the free tier. Pro unlocks better client intelligence and search visibility, not more usage.',
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
            <a href="/join/trade" className="min-h-[44px] flex items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors">
              Join free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-brand-navy px-4 py-20 sm:py-24 sm:px-6 text-center">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">Simple, honest pricing.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/60 leading-relaxed">
          Free forever for tradespeople who want the basics. Pro for those who want the full picture.
        </p>
      </section>

      {/* ── Pricing cards ────────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">

          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Free</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-5xl font-bold text-brand-navy">£0</span>
                <span className="mb-1.5 text-sm text-gray-400">forever</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Everything you need to get started.</p>
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {FREE_FEATURES.map(f => (
                <FeatureItem key={f} text={f} />
              ))}
            </ul>

            <a
              href="/join/trade"
              className="mt-8 flex min-h-[48px] items-center justify-center rounded-xl border-2 border-brand-navy px-6 text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
            >
              Join free
            </a>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl bg-brand-navy p-8 shadow-lg">
            <span className="absolute right-5 top-5 rounded-full bg-brand-amber px-3 py-1 text-xs font-bold text-brand-navy">
              Most popular
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Pro</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-5xl font-bold text-white">£19</span>
                <span className="mb-1.5 text-sm text-white/50">per month</span>
              </div>
              <p className="mt-2 text-sm text-white/60">For tradespeople who want the full picture.</p>
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {PRO_FEATURES.map(f => (
                <FeatureItem key={f} text={f} light />
              ))}
            </ul>

            <a
              href="/join/trade"
              className="mt-8 flex min-h-[48px] items-center justify-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Go Pro
            </a>
          </div>

        </div>
      </section>

      {/* ── Client banner ────────────────────────────────────── */}
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl px-8 py-7 text-center" style={{ backgroundColor: '#F3F4F6' }}>
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

function FeatureItem({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 text-sm font-bold ${light ? 'text-brand-amber' : 'text-brand-navy'}`}>
        ✓
      </span>
      <span className={`text-sm leading-relaxed ${light ? 'text-white/80' : 'text-gray-600'}`}>
        {text}
      </span>
    </li>
  )
}
