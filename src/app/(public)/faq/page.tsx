import type { Metadata } from 'next'
import { FaqAccordion } from './faq-accordion'
import { MarketingNav } from '@/components/marketing/site/marketing-nav'
import { MarketingFooter } from '@/components/marketing/site/marketing-footer'

export const metadata: Metadata = {
  title: 'FAQ | WorkedWith',
  description: 'Answers to common questions about WorkedWith: pricing, getting paid, reviews, client records and finding a trade.',
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

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

      <MarketingFooter />
    </div>
  )
}
