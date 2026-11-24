import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, PageShell, PageTitle } from '@/components/ui'

export const metadata = { title: 'Exports | WorkedWith' }

const EXPORTS = [
  { kind: 'invoices', label: 'Invoices (CSV)', note: 'Number, date, client, net, VAT, total, status' },
  { kind: 'payments', label: 'Payments (CSV)', note: 'Date, invoice, amount, method, Stripe card fees' },
  { kind: 'credit-notes', label: 'Credit notes (CSV)', note: 'Number, date, invoice, amounts' },
  { kind: 'invoices-pdf', label: 'All invoices (one PDF)', note: 'Every invoice in the period' },
]

/** Exports for the accountant (PRD 11). Available even after the trial or plan ends. */
export default async function ExportsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const now = new Date()
  const taxYearStart = new Date(Date.UTC(now.getUTCMonth() > 3 || (now.getUTCMonth() === 3 && now.getUTCDate() >= 6) ? now.getUTCFullYear() : now.getUTCFullYear() - 1, 3, 6))
  const from = searchParams.from ?? taxYearStart.toISOString().slice(0, 10)
  const to = searchParams.to ?? now.toISOString().slice(0, 10)
  return (
    <PageShell>
      <PageTitle title="Exports" sub="For your accountant, or any accounting software we don’t sync with." back={{ href: '/profile', label: 'Profile' }} />
      <Card>
        <form method="GET" className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <label className="text-sm font-medium text-gray-800">From<input type="date" name="from" defaultValue={from} className="mt-1 block min-h-[48px] w-full rounded-xl border border-gray-300 px-3" /></label>
          <label className="text-sm font-medium text-gray-800">To<input type="date" name="to" defaultValue={to} className="mt-1 block min-h-[48px] w-full rounded-xl border border-gray-300 px-3" /></label>
          <button className="min-h-[48px] rounded-xl border-2 border-brand-navy text-sm font-semibold text-brand-navy">Update dates</button>
        </form>
      </Card>
      <ul className="space-y-2">
        {EXPORTS.map(e => (
          <li key={e.kind}>
            <a href={`/api/exports/${e.kind}?from=${from}&to=${to}`} className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 hover:border-brand-amber">
              <span><span className="block text-sm font-semibold text-brand-navy">{e.label}</span><span className="text-xs text-gray-500">{e.note}</span></span>
              <span aria-hidden="true">↓</span>
            </a>
          </li>
        ))}
      </ul>
    </PageShell>
  )
}
