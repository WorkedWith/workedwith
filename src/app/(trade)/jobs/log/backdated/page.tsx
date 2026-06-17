import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BackdatedJobForm } from './backdated-job-form'
import type { JobInitiatedBy } from '@/types/database'

export const metadata = { title: 'Add a past job | WorkedWith' }

export default async function BackdatedJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || !userData.phone_verified) redirect('/verify/phone')

  const userType = userData.user_type

  // Determine direction from user type; check the required profile exists
  let initiatedBy: JobInitiatedBy

  if (userType === 'trade') {
    const { data: tradeProfile } = await admin
      .from('trade_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!tradeProfile) redirect('/onboarding/trade')
    initiatedBy = 'trade'
  } else if (userType === 'client_individual' || userType === 'client_business') {
    const { data: clientProfile } = await admin
      .from('client_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!clientProfile) redirect('/onboarding/individual')
    initiatedBy = 'client'
  } else if (userType === 'both') {
    // Users with both profiles default to trade-initiated for this flow
    const { data: tradeProfile } = await admin
      .from('trade_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!tradeProfile) redirect('/onboarding/trade')
    initiatedBy = 'trade'
  } else {
    redirect('/dashboard')
  }

  const subtitle =
    initiatedBy === 'trade'
      ? 'Invite your client to confirm — you can both leave verified reviews once they accept.'
      : 'Invite the tradesperson to confirm — you can both leave verified reviews once they accept.'

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Add a past job</h1>
          <p className="mt-2 text-sm text-white/60">{subtitle}</p>
        </div>
        <BackdatedJobForm initiatedBy={initiatedBy} />
        <div className="mt-4 text-center">
          <a href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">
            ← Back to dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
