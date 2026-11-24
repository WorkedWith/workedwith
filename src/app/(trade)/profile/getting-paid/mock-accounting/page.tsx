import { notFound } from 'next/navigation'
import { accountingMode, PLATFORM_LABEL } from '@/lib/accounting'
import type { AccountingPlatform } from '@/types/v42'

export const metadata = { title: 'Test accounting software | WorkedWith' }

/** Pretend approval screen for ACCOUNTING_MODE=mock. */
export default function MockAccountingPage({ searchParams }: { searchParams: { platform?: string; state?: string; redirect_uri?: string } }) {
  if (accountingMode() !== 'mock' || !searchParams.state || !searchParams.redirect_uri || !searchParams.platform) notFound()
  const label = PLATFORM_LABEL[searchParams.platform as AccountingPlatform] ?? 'Accounting software'
  const back = `${searchParams.redirect_uri}?code=mock&state=${encodeURIComponent(searchParams.state)}`
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Test mode. No real {label} account is used.</p>
      <h1 className="text-2xl font-bold text-brand-navy">Allow WorkedWith to send records to {label}?</h1>
      <ul className="space-y-1 text-sm text-gray-700">
        <li>✓ Create contacts, invoices, payments and credit notes</li>
        <li>✓ List your accounts once, so you can pick where things go</li>
        <li>✗ Never read, change or delete anything else</li>
      </ul>
      <a href={back} className="flex min-h-[52px] items-center justify-center rounded-xl bg-brand-amber text-base font-bold text-brand-navy">Allow</a>
      <a href={`${searchParams.redirect_uri}?state=${encodeURIComponent(searchParams.state)}`} className="block text-center text-sm text-gray-500 underline">Cancel</a>
    </main>
  )
}
