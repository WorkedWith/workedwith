import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/site/marketing-nav'
import { MarketingFooter } from '@/components/marketing/site/marketing-footer'
import { CostTable } from '@/components/marketing/site/cost-table'

export const metadata: Metadata = {
  title: 'Pricing | WorkedWith',
  description: 'One plan for trades: £19.99 a month after a 30 day free trial. No transaction fees. Always free for clients.',
}

const EVERY_TRADE: [string, string][] = [
  ['Quotes, jobs, invoices, chasing', 'Unlimited'],
  ['Bank transfer payments and automatic matching', 'Included, no transaction fees'],
  ['Accounting sync', 'Optional: Xero, QuickBooks, FreeAgent or Sage'],
  ['Profile gallery', 'Up to 10 photos'],
  ['Featured jobs', 'Up to 3 paid WorkedWith jobs, 5 photos each'],
  ['Operating districts', 'Up to 20 postcode districts'],
  ['Review responses', 'One 300 character response per review'],
  ['Client records', 'Full record for any client you quote or look up'],
  ['Profile activity', 'Profile views and Email now clicks, last 30 and 90 days'],
  ['Profile link and QR code', 'Included, for vans, cards and social media'],
  ['Dispute handling', 'Same priority for everyone'],
  ['Boosted Districts', 'Optional extra at £10 a month per district'],
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav />

      <header className="px-4 pb-10 pt-12 text-center sm:px-6 sm:pt-16">
        <h1 className="text-4xl font-bold text-brand-navy sm:text-5xl">One plan. One price.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">£19.99 a month is the only cost from WorkedWith. Clients never pay.</p>
      </header>

      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-md rounded-3xl border-2 border-brand-amber bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">For trades</p>
          <p className="mt-4 text-5xl font-bold text-brand-navy">£19.99</p>
          <p className="mt-1 text-gray-500">a month, after a 30 day free trial</p>
          <ul className="mt-6 space-y-2 text-left text-sm text-gray-700">
            <li>✓ Every feature included</li>
            <li>✓ No card needed to start</li>
            <li>✓ No transaction fees on bank payments</li>
            <li>✓ Cancel any time</li>
          </ul>
          <a href="/join/trade" className="mt-8 flex min-h-[52px] items-center justify-center rounded-xl bg-brand-amber text-base font-bold text-brand-navy hover:bg-amber-400">
            Start free trial
          </a>
          <p className="mt-3 text-xs text-gray-500">We ask for a card before the trial ends, with reminders at day 23, 28 and 30.</p>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-brand-navy">What it costs a trade, in plain words</h2>
          <div className="mt-6"><CostTable /></div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-brand-navy">What every trade gets</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <dl className="divide-y divide-gray-100">
              {EVERY_TRADE.map(([feature, value]) => (
                <div key={feature} className="grid gap-1 px-5 py-3.5 sm:grid-cols-2 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-700">{feature}</dt>
                  <dd className="text-sm text-brand-navy">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-brand-navy">If the trial ends without a card</h3>
            <p className="mt-2 text-sm text-gray-600">
              You can&apos;t send new quotes, your listing is hidden and chasing stops. Clients can still pay invoices
              you&apos;ve already sent, and you can still mark payments, download invoices and write open reviews.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-brand-navy">Clients are always free</h3>
            <p className="mt-2 text-sm text-gray-600">
              Clients never pay WorkedWith. They pay the trade directly, by bank transfer or by card if the trade takes cards,
              and the price is the same either way.
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
