/** The plain cost table (PRD 3). Use on the pricing page and for trades. */
const ROWS: { what: string; cost: string; note?: string }[] = [
  { what: 'WorkedWith', cost: '£19.99 a month', note: 'After a 30 day free trial. Everything included.' },
  { what: 'Bank transfer payments from clients', cost: 'Free', note: 'No transaction fees, ever.' },
  { what: 'Connecting your bank so invoices mark themselves paid', cost: 'Free', note: 'WorkedWith pays for it.' },
  { what: 'Accounting software sync', cost: 'Free', note: 'You need your own Xero, QuickBooks, FreeAgent or Sage account.' },
  { what: 'Card payments (optional, only if you switch them on)', cost: "Stripe's fee", note: 'Charged by Stripe directly, currently 1.5% + 20p for standard UK cards. WorkedWith takes nothing.' },
  { what: 'Boosted Districts (optional)', cost: '£10 a month per district' },
]

export function CostTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <dl className="divide-y divide-gray-100">
        {ROWS.map(r => (
          <div key={r.what} className="grid gap-1 px-5 py-4 sm:grid-cols-5 sm:gap-4">
            <dt className="text-sm font-medium text-gray-700 sm:col-span-3">{r.what}</dt>
            <dd className="sm:col-span-2">
              <span className="block text-base font-bold text-brand-navy">{r.cost}</span>
              {r.note && <span className="mt-0.5 block text-sm text-gray-500">{r.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
