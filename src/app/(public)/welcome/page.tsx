import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

export const metadata = { title: 'Welcome to WorkedWith', robots: { index: false } }

const STEPS = [
  { label: 'Build your profile', href: '/profile/edit', note: 'Business name, trades, districts and your business email.' },
  { label: 'Add your bank details', href: '/profile/getting-paid', note: 'Needed before your first quote, so clients know where to pay.' },
  { label: 'Connect your bank', href: '/profile/getting-paid', note: 'Optional. Invoices mark themselves paid when the money arrives.' },
  { label: 'Connect accounting software', href: '/profile/getting-paid', note: 'Optional. Xero, QuickBooks, FreeAgent or Sage.' },
  { label: 'Send your first quote', href: '/quotes/new', note: 'From your phone or your desktop.' },
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
      <div className="bg-brand-navy px-4 pb-12 pt-12 text-center sm:px-6">
        <a href="/dashboard" className="text-2xl font-bold tracking-tight text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <h1 className="mt-8 text-3xl font-bold text-white sm:text-4xl">Your 30 day free trial has started</h1>
        <p className="mt-3 text-lg text-white/70">Everything is included. No card needed until the trial ends.</p>
      </div>
      <div className="mx-auto -mt-6 max-w-xl px-4 pb-12 sm:px-6">
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <a href={s.href} className="flex min-h-[64px] items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-brand-amber">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-amber text-sm font-bold text-brand-navy">{i + 1}</span>
                <span>
                  <span className="block text-base font-semibold text-brand-navy">{s.label}</span>
                  <span className="block text-sm text-gray-600">{s.note}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
        <a href="/dashboard" className="mt-6 block text-center text-sm font-semibold text-brand-navy underline">Go to home</a>
      </div>
    </main>
  )
}
