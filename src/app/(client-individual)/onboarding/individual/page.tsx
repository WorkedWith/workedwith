import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientIndividualForm } from './client-individual-form'

export const metadata = { title: 'Create your profile | WorkedWith' }

export default async function ClientIndividualOnboardingPage() {
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

  // Already has a client profile — skip onboarding
  const { data: existing } = await admin
    .from('client_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
            Create your profile
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Tell us a bit about yourself so tradespeople know who they&apos;re working with.
          </p>
        </div>
        <ClientIndividualForm initialFullName={userData.full_name} />
      </div>
    </main>
  )
}
