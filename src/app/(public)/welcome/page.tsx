import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UpgradeButton } from './upgrade-button'
import type { User } from '@/types/database'

export const metadata = { title: 'Welcome to WorkedWith' }

const FREE_FEATURES = [
  'Unlimited job logging',
  'Unlimited reviews',
  'Public profile at workedwith.co.uk/t/your-username',
  'Basic client lookup — overall rating only',
  'Add past jobs to build your history',
]

const PRO_EXTRAS = [
  'Full client profile on lookup — payment score, red flags, written reviews',
  'Your profile appears in client search results',
  'Verified badge on your public profile',
  'Respond publicly to client reviews',
]

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('user_type').eq('id', user.id).single()
  const userType = (userData as unknown as Pick<User, 'user_type'> | null)?.user_type

  if (userType !== 'trade' && userType !== 'both') redirect('/dashboard')

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navy header */}
      <div className="bg-brand-navy px-4 pb-16 pt-12 text-center sm:px-6">
        <a href="/dashboard" className="text-2xl font-bold tracking-tight text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <h1 className="mt-8 text-3xl font-bold text-white sm:text-4xl">
          Your WorkedWith profile is live
        </h1>
        <p className="mt-3 text-lg text-white/70">
          Choose how you want to use WorkedWith
        </p>
      </div>

      {/* Pricing cards */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">

          {/* Free card */}
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Free</p>
              <p className="mt-2 text-4xl font-bold text-brand-navy">
                £0{' '}
                <span className="text-lg font-normal text-gray-400">forever</span>
              </p>
            </div>

            <ul className="mt-7 flex-1 space-y-3">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <TickIcon />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="/dashboard"
              className="mt-8 block w-full rounded-lg border-2 border-brand-navy py-3 text-center text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
            >
              Continue with free
            </a>
          </div>

          {/* Pro card */}
          <div className="flex flex-col rounded-2xl border-2 border-brand-amber bg-white p-7 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-900">Pro</p>
                <p className="mt-2 text-4xl font-bold text-brand-navy">
                  £9.99{' '}
                  <span className="text-lg font-normal text-gray-400">/month</span>
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-amber px-2.5 py-1 text-xs font-semibold text-brand-navy">
                Verified
              </span>
            </div>

            <ul className="mt-7 flex-1 space-y-3">
              <li className="flex items-start gap-2.5 text-sm font-medium text-brand-navy">
                <TickIcon amber />
                Everything in Free
              </li>
              {PRO_EXTRAS.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <TickIcon amber />
                  {f}
                </li>
              ))}
            </ul>

            <UpgradeButton />
          </div>

        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          You can upgrade or downgrade anytime from your account settings. No contracts.
        </p>
      </div>
    </main>
  )
}

function TickIcon({ amber }: { amber?: boolean }) {
  return (
    <svg
      className={`mt-0.5 h-4 w-4 shrink-0 ${amber ? 'text-brand-amber' : 'text-green-500'}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}
