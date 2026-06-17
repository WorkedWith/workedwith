import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientSearchForm } from './client-search-form'

export const metadata = { title: 'Client lookup | WorkedWith' }

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || !userData.phone_verified) redirect('/verify/phone')
  if (userData.user_type !== 'trade' && userData.user_type !== 'both') redirect('/dashboard')

  // Fetch subscription tier so the page can label the search correctly
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('subscription_tier')
    .eq('user_id', user.id)
    .maybeSingle()

  const subscriptionTier = (tradeProfile?.subscription_tier as string | null | undefined) ?? 'free'
  const isPro = subscriptionTier === 'pro' || subscriptionTier === 'team'

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <a href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Client lookup</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isPro
              ? 'Search any client by email or phone to view their full reputation profile.'
              : 'Free plan — search clients to see their rating and verification status. Upgrade to Pro for full scores and written reviews.'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
          <p className="text-xs text-gray-500">
            <strong className="font-medium text-gray-700">Privacy notice:</strong>{' '}
            Searches are logged and audited. Results are only returned for users who have a WorkedWith client profile.
            Searches are limited to 20 per day.
          </p>
        </div>

        <ClientSearchForm />
      </div>
    </main>
  )
}
