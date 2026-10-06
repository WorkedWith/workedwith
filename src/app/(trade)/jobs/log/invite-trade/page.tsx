import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteTradeForm } from './invite-trade-form'

export const metadata = { title: 'Invite a tradesperson | WorkedWith' }

export default async function InviteTradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/jobs/log/invite-trade')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || userData.verification_tier === 'unverified') {
    redirect('/verify/phone')
  }

  const { data: clientProfile } = await admin
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clientProfile) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Invite a tradesperson</h1>
          <p className="mt-2 text-sm text-white/60">
            Log a job with a tradesperson who isn&apos;t on WorkedWith yet. They&apos;ll receive an invite to
            verify and claim it — nothing is published until they do.
          </p>
        </div>
        <InviteTradeForm />
        <div className="mt-4 text-center">
          <a href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">
            ← Back to dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
