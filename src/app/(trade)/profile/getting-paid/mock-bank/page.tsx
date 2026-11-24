import { notFound } from 'next/navigation'
import { isMockOpenBanking } from '@/lib/open-banking'

export const metadata = { title: 'Test bank | WorkedWith' }

const BANKS = ['Barclays', 'HSBC', 'Lloyds', 'Monzo Business', 'NatWest', 'Santander', 'Starling', 'Tide']

/** Pretend bank picker for OPEN_BANKING_PROVIDER=mock. Never reachable with a real provider. */
export default function MockBankPage({ searchParams }: { searchParams: { state?: string; redirect_uri?: string } }) {
  if (!isMockOpenBanking() || !searchParams.state || !searchParams.redirect_uri) notFound()
  const base = searchParams.redirect_uri
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Test mode. No real bank is contacted.</p>
      <h1 className="text-2xl font-bold text-brand-navy">Choose your bank</h1>
      <p className="text-sm text-gray-600">You will approve read only access to incoming payments. WorkedWith can never move money.</p>
      <ul className="space-y-2">
        {BANKS.map(b => (
          <li key={b}>
            <a
              href={`${base}?code=${encodeURIComponent(`mock_${b}`)}&state=${encodeURIComponent(searchParams.state ?? '')}`}
              className="flex min-h-[56px] items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-base font-semibold text-brand-navy hover:border-brand-amber"
            >
              {b} <span aria-hidden="true">›</span>
            </a>
          </li>
        ))}
      </ul>
      <a href={`${base}?error=cancelled&state=${encodeURIComponent(searchParams.state ?? '')}`} className="block text-center text-sm text-gray-500 underline">Cancel</a>
    </main>
  )
}
