import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/site/marketing-nav'
import { MarketingFooter } from '@/components/marketing/site/marketing-footer'
import { FeatureGrid, Steps } from '@/components/marketing/site/feature-grid'

export const metadata: Metadata = {
  title: 'For clients | WorkedWith',
  description: 'Every review comes from a real, paid job. Find trades you can trust. Always free for clients.',
}

const STEPS = [
  { title: 'Get your quote', body: 'Your trade sends it by text and email. Open it on your phone with a text code. No app, no password.' },
  { title: 'Accept it', body: 'See the price, the deposit, the planned start and the terms before you agree.' },
  { title: 'Track the job', body: 'See what has been done with photos, approve extras before the work and approve each stage.' },
  { title: 'Pay and review', body: 'Pay the trade directly by bank transfer, then review them. They review you too.' },
]

const FEATURES = [
  { icon: '⭐', title: 'Every review is real', body: 'Reviews only come from jobs that ran through WorkedWith and were paid for, so they cannot be bought or invented.' },
  { icon: '👍', title: 'Nothing agreed without you', body: 'Quotes, extras, start dates and stages are only approved by you, in your own account. Silence never counts as yes.' },
  { icon: '🏦', title: 'Pay the trade directly', body: 'By bank transfer straight to their account, with copy buttons for the details. WorkedWith never holds your money.' },
  { icon: '🧾', title: 'Everything in one place', body: 'Your quote, extras, invoices and receipts, all on one page per job.' },
  { icon: '📍', title: 'Find trusted trades nearby', body: 'Had a good job done? Find other trades in your area ranked on reviews from real, paid jobs. Tap Email now to ask for a quote.' },
  { icon: '🤝', title: 'Be a client trades want', body: 'Trades review you too. Pay on time and your record shows it.' },
]

export default function ForClientsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav />

      <header className="bg-amber-50 px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">For clients</p>
          <h1 className="mt-3 text-balance text-4xl font-bold leading-tight text-brand-navy sm:text-5xl">
            Every review comes from a real, paid job.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray-700">
            Find trades you can trust, and be a client they want to work for. Always free.
          </p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <a href="/find" className="flex min-h-[52px] items-center justify-center rounded-xl bg-brand-navy px-7 text-base font-bold text-white hover:bg-brand-navy/90">
              Find a trade
            </a>
            <a href="/sign-in" className="flex min-h-[52px] items-center justify-center rounded-xl border-2 border-brand-navy px-7 text-base font-semibold text-brand-navy">
              See my jobs
            </a>
          </div>
        </div>
      </header>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">How a job works</h2>
          <div className="mt-10"><Steps items={STEPS} /></div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FeatureGrid items={FEATURES} />
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-brand-navy p-8 text-center text-white sm:p-10">
          <h2 className="text-2xl font-bold">Got a quote from a trade on WorkedWith?</h2>
          <p className="mt-3 text-white/70">
            Open the link in your text or email. It creates your free account and takes you straight to your quote.
          </p>
          <a href="/find" className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-amber px-6 text-sm font-bold text-brand-navy">
            Find another trade nearby
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
