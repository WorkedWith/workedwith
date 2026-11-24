import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/site/marketing-nav'
import { MarketingFooter } from '@/components/marketing/site/marketing-footer'
import { FeatureGrid, Steps } from '@/components/marketing/site/feature-grid'
import { CostTable } from '@/components/marketing/site/cost-table'
import { AccountingLogos } from '@/components/marketing/site/accounting-logos'
import { LandingVideo } from '@/components/marketing/site/landing-video'

export const metadata: Metadata = {
  title: 'For trades | WorkedWith',
  description: 'Every job agreed. Every job paid. Quote, invoice and get paid in one place for £19.99 a month.',
}

const STEPS = [
  { title: 'Quote from your phone', body: 'Client, job and price. A simple quote goes in under a minute, on site or at your desk.' },
  { title: 'The client accepts', body: 'In their own account, with your terms and any deposit. You get a clear record of them agreeing.' },
  { title: 'Do the work', body: 'Mark stages done with photos. Extras go to the client to approve before you start them.' },
  { title: 'Get paid', body: 'They pay by bank transfer straight to you. The invoice marks itself paid and late payments are chased for you.' },
]

const FEATURES = [
  { icon: '📝', title: 'Quotes in under a minute', body: 'Saved items, copy a past quote, deposits, stages and VAT. The whole builder works one handed on a phone.' },
  { icon: '✅', title: 'Extras approved before the work', body: 'Send a variation from site with photos. The client approves it in their account, so there are no arguments at the end.' },
  { icon: '🏦', title: 'Paid by bank transfer, no fees', body: 'Clients pay straight into your account using the reference on the invoice. Connect your bank and invoices mark themselves paid.' },
  { icon: '⏰', title: 'Chasing done for you', body: 'Friendly reminders before the due date, then late payment notices in your name. A letter before action is ready when you need it.' },
  { icon: '🔎', title: 'Know who pays before you quote', body: 'See a client’s record from other trades: jobs paid on time, reviews and red flags. Every client is reviewed too.' },
  { icon: '⭐', title: 'A reputation from real jobs', body: 'Every review is tied to a paid job. Clients who liked how you worked come back to find you in the directory.' },
  { icon: '📒', title: 'Accounting sync', body: 'Invoices and payments go straight to Xero, QuickBooks, FreeAgent or Sage. Or download a CSV for your accountant.' },
  { icon: '📱', title: 'Your profile link and QR code', body: 'For your van, your cards and social media. Clients tap Email now and the enquiry lands in your own inbox.' },
  { icon: '🔒', title: 'Your money never touches us', body: 'WorkedWith never holds or moves money. Open banking only reads incoming payments so invoices can mark themselves paid.' },
]

export default function ForTradesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav dark />

      <header className="bg-brand-navy px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-amber">For trades</p>
          <h1 className="mt-3 text-balance text-4xl font-bold leading-tight text-white sm:text-6xl">Every job agreed. Every job paid.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            Quote, invoice and get paid in one place. Every job builds your reputation, and you&apos;ll know who pays before you quote.
          </p>
          <a href="/join/trade" className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-xl bg-brand-amber px-8 text-base font-bold text-brand-navy hover:bg-amber-400">
            Start your 30 day free trial
          </a>
          <p className="mt-3 text-sm text-white/50">No card needed. £19.99 a month after that. No transaction fees.</p>
        </div>
      </header>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">From quote to paid</h2>
          <div className="mt-10"><Steps items={STEPS} /></div>
        </div>
      </section>

      <LandingVideo title="See a job go from quote to paid" />

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">Everything you need to get paid</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">Every trade gets every feature. One plan, one price.</p>
          <div className="mt-10"><FeatureGrid items={FEATURES} /></div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-brand-navy sm:text-3xl">Works with your accounting software</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            One way and optional. We send invoices, payments and credit notes. We never read or change anything else in your accounts.
          </p>
          <div className="mt-6 flex justify-center"><AccountingLogos /></div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">What it costs, in plain words</h2>
          <div className="mt-8"><CostTable /></div>
          <div className="mt-8 text-center">
            <a href="/join/trade" className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-brand-amber px-8 text-base font-bold text-brand-navy hover:bg-amber-400">
              Start free trial
            </a>
            <p className="mt-3 text-sm text-gray-500">
              Already listed on WorkedWith? Find your business and claim it to start your trial.
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
