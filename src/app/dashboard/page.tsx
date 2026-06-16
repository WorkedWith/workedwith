import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Dashboard | WorkedWith' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/')

  const { verification_tier, user_type, full_name } = userData

  if (verification_tier === 'unverified') redirect('/verify/phone')

  // Route to onboarding if no profile yet
  if (!user_type) redirect('/verify/phone')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 py-4 sm:px-6">
        <span className="text-xl font-bold tracking-tight text-white">
          Worked<span className="text-brand-amber">With</span>
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-brand-navy">
          Welcome back, {full_name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-gray-500 capitalize">
          {user_type === 'tradesperson' ? 'Tradesperson' : 'Client'} account
        </p>

        {/* Placeholder content — full dashboards built in a later module */}
        <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          <p className="text-sm font-medium">Dashboard coming soon</p>
          <p className="mt-1 text-xs">This area will be built out in a later module.</p>
        </div>
      </div>
    </main>
  )
}
