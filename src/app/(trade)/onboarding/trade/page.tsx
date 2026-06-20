import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TradeOnboardingForm } from './trade-onboarding-form'

export const metadata = { title: 'Create your trade profile | WorkedWith' }

type PageProps = {
  searchParams: Promise<{ redirect?: string; upgrading?: string }>
}

export default async function TradeOnboardingPage({ searchParams }: PageProps) {
  const { redirect: redirectParam, upgrading: upgradingParam } = await searchParams
  // Only allow internal redirects
  const redirectTo = redirectParam?.startsWith('/') ? redirectParam : undefined
  const upgrading = upgradingParam === 'true'

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

  if (!userData || userData.verification_tier === 'unverified') {
    redirect('/verify/phone')
  }

  // Already has a trade profile — skip onboarding
  const { data: existing } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) redirect(redirectTo ?? '/dashboard')

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
            Create your trade profile
          </h1>
          <p className="mt-2 text-sm text-white/60">
            This is how clients will find and trust you.
          </p>
        </div>
        <TradeOnboardingForm redirectTo={redirectTo} upgrading={upgrading} />
      </div>
    </main>
  )
}
