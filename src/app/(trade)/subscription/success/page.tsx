import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Plan set up | WorkedWith' }

export default async function SubscriptionSuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  if (!searchParams.session_id) redirect('/subscription')

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <p className="text-4xl" aria-hidden="true">✓</p>
        <h1 className="mt-4 text-2xl font-bold text-brand-navy">Thanks, your plan is set up</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your card is saved with Stripe. You can manage or cancel your plan at any time.
        </p>
        <a href="/dashboard" className="mt-6 inline-flex min-h-[48px] items-center rounded-xl bg-brand-navy px-6 text-base font-semibold text-white">
          Back to home
        </a>
      </div>
    </main>
  )
}
