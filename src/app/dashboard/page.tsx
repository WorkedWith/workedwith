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

  const isTrade = user_type === 'trade' || user_type === 'both'
  const accountLabel =
    user_type === 'trade' ? 'Tradesperson' :
    user_type === 'client_individual' ? 'Client' :
    user_type === 'client_business' ? 'Business client' : 'Account'

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
        <p className="mt-1 text-sm text-gray-500">{accountLabel} account</p>

        {/* Primary actions */}
        <div className={`mt-8 grid gap-4 ${isTrade ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {isTrade && (
            <a
              href="/jobs/log"
              className="flex flex-col gap-2 rounded-2xl bg-brand-navy p-6 text-white hover:opacity-90 transition-opacity"
            >
              <span className="text-2xl" aria-hidden>&#43;</span>
              <span className="text-lg font-semibold">Log a job</span>
              <span className="text-sm text-white/60 leading-snug">
                Invite your client to confirm a current or upcoming job.
              </span>
            </a>
          )}
          <a
            href="/jobs/log/backdated"
            className="flex flex-col gap-2 rounded-2xl bg-brand-amber p-6 text-brand-navy hover:opacity-90 transition-opacity"
          >
            <span className="text-2xl" aria-hidden>&#8635;</span>
            <span className="text-lg font-semibold">Add a past job</span>
            <span className="text-sm text-brand-navy/60 leading-snug">
              Worked with someone before? Log it and invite them to confirm — build your verified history from day one.
            </span>
          </a>
        </div>

        {/* Placeholder content — full dashboards built in a later module */}
        <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          <p className="text-sm font-medium">Your jobs will appear here</p>
          <p className="mt-1 text-xs">Full dashboard coming in a later module.</p>
        </div>
      </div>
    </main>
  )
}
