import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LogJobForm } from './log-job-form'

export const metadata = { title: 'Log a job | WorkedWith' }

export default async function LogJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || userData.verification_tier === 'unverified') redirect('/verify/phone')

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('total_jobs')
    .eq('user_id', user.id)
    .maybeSingle()

  const isFirstJob = (tradeProfile?.total_jobs ?? 0) === 0

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Log a job</h1>
          <p className="mt-2 text-sm text-white/60">
            {isFirstJob
              ? 'Log your first job to start building your WorkedWith profile. Your client confirms it — then mutual reviews unlock once the job is done.'
              : 'Invite your client to confirm the job — both parties can leave verified reviews once it\'s done.'}
          </p>
        </div>
        <LogJobForm />
        <div className="mt-4 text-center">
          <a href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">
            ← Back to dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
