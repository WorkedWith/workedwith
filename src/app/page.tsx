import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/site/marketing-nav'
import { MarketingFooter } from '@/components/marketing/site/marketing-footer'
import { LandingVideo } from '@/components/marketing/site/landing-video'
import { Steps } from '@/components/marketing/site/feature-grid'
import { AccountingLogos } from '@/components/marketing/site/accounting-logos'

export const metadata: Metadata = {
  title: "WorkedWith | Know who you're working with",
  description:
    'The UK directory of trades where every review comes from a real, paid job, and where clients have a reputation too.',
}

const HOW = [
  { title: 'The trade quotes', body: 'Built in a minute on a phone or a desktop, and sent to the client by text and email.' },
  { title: 'The client agrees', body: 'They accept from their own account, and approve any extras before the work is done.' },
  { title: 'The client pays', body: 'By bank transfer straight to the trade. The invoice marks itself paid when the money lands.' },
  { title: 'Both sides review', body: 'Only once the job is paid. Reviews publish together, so neither side can write back in revenge.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav dark />

      <header className="bg-brand-navy px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-4xl font-bold leading-[1.1] text-white sm:text-6xl">
            Know who you&apos;re working with.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-white/70">
            The UK directory of trades where every review comes from a real, paid job, and where clients have a reputation too.
          </p>
          <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <a href="/join/trade" className="flex min-h-[52px] items-center justify-center rounded-xl bg-brand-amber px-7 text-base font-bold text-brand-navy hover:bg-amber-400">
              I&apos;m a trade: start free trial
            </a>
            <a href="/find" className="flex min-h-[52px] items-center justify-center rounded-xl border-2 border-white/30 px-7 text-base font-semibold text-white hover:bg-white/10">
              Find a trade near you
            </a>
          </div>
          <p className="mt-4 text-sm text-white/50">Free for clients, always. £19.99 a month for trades after 30 days free.</p>
        </div>
      </header>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">Every review is tied to a paid job</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
            Trades run their jobs through WorkedWith, so every job proves the work happened and money changed hands.
            Only then can either side review the other.
          </p>
          <div className="mt-10">
            <Steps items={HOW} />
          </div>
        </div>
      </section>

      <LandingVideo />

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <article className="flex flex-col rounded-3xl bg-brand-navy p-8 text-white sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-amber">For trades</p>
            <h2 className="mt-3 text-3xl font-bold">Every job agreed. Every job paid.</h2>
            <p className="mt-4 leading-relaxed text-white/70">
              Quote, invoice and get paid in one place. Every job builds your reputation, and you&apos;ll know who pays before you quote.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/80">
              <li>✓ Quotes and extras approved by the client, on record</li>
              <li>✓ Bank transfers that mark invoices paid, with no transaction fees</li>
              <li>✓ Late payments chased automatically, in your name</li>
              <li>✓ Client records from other trades before you quote</li>
            </ul>
            <div className="mt-6"><AccountingLogos dark /></div>
            <a href="/for-trades" className="mt-8 inline-flex min-h-[48px] items-center justify-center self-start rounded-xl bg-brand-amber px-6 text-sm font-bold text-brand-navy hover:bg-amber-400">
              See how it works for trades
            </a>
          </article>
          <article className="flex flex-col rounded-3xl border-2 border-brand-amber bg-white p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">For clients</p>
            <h2 className="mt-3 text-3xl font-bold text-brand-navy">Reviews you can trust</h2>
            <p className="mt-4 leading-relaxed text-gray-600">
              Every review comes from a real, paid job. Find trades you can trust, and be a client they want to work for.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-700">
              <li>✓ Quotes, extras and invoices in one place on your phone</li>
              <li>✓ Nothing is agreed unless you approve it</li>
              <li>✓ Pay the trade directly by bank transfer, with no fees</li>
              <li>✓ Always free</li>
            </ul>
            <a href="/for-clients" className="mt-8 inline-flex min-h-[48px] items-center justify-center self-start rounded-xl bg-brand-navy px-6 text-sm font-bold text-white hover:bg-brand-navy/90">
              See how it works for clients
            </a>
          </article>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
          <h2 className="text-2xl font-bold text-brand-navy">One price for trades. Nothing for clients.</h2>
          <p className="mt-3 text-gray-600">
            £19.99 a month after a 30 day free trial, with no card needed to start. No transaction fees on bank payments.
            WorkedWith never holds your money.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/pricing" className="flex min-h-[48px] items-center justify-center rounded-xl border-2 border-brand-navy px-6 text-sm font-semibold text-brand-navy">See pricing</a>
            <a href="/join/trade" className="flex min-h-[48px] items-center justify-center rounded-xl bg-brand-amber px-6 text-sm font-bold text-brand-navy">Start free trial</a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
