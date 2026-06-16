import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BusinessOnboardingForm } from './business-onboarding-form'

export const metadata = { title: 'Register your business | WorkedWith' }

export default async function BusinessOnboardingPage() {
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

  // Already registered a business — go to dashboard
  if (userData.organisation_id) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
            Register your business
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Business accounts are verified against Companies House to build trust
            with the tradespeople you hire.
          </p>
        </div>

        <BusinessOnboardingForm userFullName={userData.full_name} />

        <p className="mt-6 text-center text-xs text-white/40">
          You must be a registered director or person with significant control (PSC)
          to register a business account.
        </p>
      </div>
    </main>
  )
}
