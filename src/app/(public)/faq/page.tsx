import type { Metadata } from 'next'
import { FaqAccordion } from './faq-accordion'

export const metadata: Metadata = {
  title: 'FAQ | WorkedWith',
  description: 'Answers to common questions about WorkedWith, how reviews work, pricing, finding tradespeople, and more.',
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight text-brand-navy">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/sign-in" className="min-h-[44px] flex items-center px-3 text-sm font-medium text-gray-600 hover:text-brand-navy transition-colors">
              Sign in
            </a>
            <a href="/join" className="min-h-[44px] flex items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors">
              Join free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="bg-brand-navy px-4 py-16 sm:py-20 sm:px-6 text-center">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/60 leading-relaxed">
          Everything you need to know about WorkedWith.
        </p>
      </header>

      {/* ── Accordion ────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:py-20 sm:px-6">
        <FaqAccordion />

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">
            Still have questions?{' '}
            <a href="mailto:hello@workedwith.co.uk" className="font-medium text-brand-amber hover:underline">
              hello@workedwith.co.uk
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-brand-navy px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-bold text-white">Worked<span className="text-brand-amber">With</span></p>
            <p className="mt-1 text-sm text-white/40">Know who you are working with.</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/find" className="text-sm text-white/50 hover:text-white transition-colors">Find a tradesperson</a>
            <a href="/pricing" className="text-sm text-white/50 hover:text-white transition-colors">Pricing</a>
            <a href="/join/trade" className="text-sm text-white/50 hover:text-white transition-colors">Join as Trade</a>
            <a href="/join/client" className="text-sm text-white/50 hover:text-white transition-colors">Join as Client</a>
            <a href="/sign-in" className="text-sm text-white/50 hover:text-white transition-colors">Sign in</a>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-xs text-white/30">
          &copy; {new Date().getFullYear()} WorkedWith. All rights reserved. Registered in England &amp; Wales.
        </p>
      </footer>
    </div>
  )
}
