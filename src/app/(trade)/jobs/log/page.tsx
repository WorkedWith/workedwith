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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Log a job with a client</h1>
          <p className="mt-2 text-sm text-white/60">
            {isFirstJob
              ? 'Log your first job to start building your WorkedWith profile.'
              : 'Invite your client to join the job on WorkedWith.'}
          </p>
          <ol className="mx-auto mt-4 grid max-w-xs gap-2 text-left text-sm text-white/80">
            <li className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-brand-navy">1</span>You invite your client</li>
            <li className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-brand-navy">2</span>They confirm the job</li>
            <li className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-brand-navy">3</span>When it is done, you both leave a review</li>
          </ol>
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
