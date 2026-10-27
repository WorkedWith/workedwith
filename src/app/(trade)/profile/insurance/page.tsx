import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/components/app-header'
import { BackLink } from '@/components/back-link'
import { coverLabel, longDate, todayIso } from '@/lib/insurance'
import type { TradeInsurance } from '@/types/database'
import { InsuranceForm } from './insurance-form'

export const metadata = { title: 'Insurance | WorkedWith', robots: { index: false } }

export default async function InsurancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/profile/insurance')

  const admin = createAdminClient()
  const { data: tp } = await admin.from('trade_profiles').select('id').eq('user_id', user.id).maybeSingle()
  if (!tp) redirect('/dashboard')

  const { data } = await admin.from('trade_insurance').select('*').eq('trade_id', tp.id as string).order('created_at', { ascending: false }).limit(10)
  const rows = (data ?? []) as unknown as TradeInsurance[]
  const today = todayIso()
  const live = rows.find(r => r.status === 'approved' && r.expires_on >= today)
  const pending = rows.find(r => r.status === 'pending')
  const lastRejected = !pending && !live ? rows.find(r => r.status === 'rejected') : undefined

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <BackLink href="/dashboard" label="Back to dashboard" />
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-brand-navy">Show clients you&apos;re insured</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Upload your public liability certificate and we&apos;ll add an Insured tag to your profile once we&apos;ve checked it. It&apos;s free on every plan. Clients never see the certificate itself.
          </p>

          {live && (
            <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              Your Insured tag is live: insured to {coverLabel(Number(live.cover_amount_gbp))} until {longDate(live.expires_on)}.
            </p>
          )}
          {pending && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              We&apos;re checking your certificate. We&apos;ll email you when it&apos;s done.
            </p>
          )}
          {lastRejected && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              We couldn&apos;t add your Insured tag: {lastRejected.reject_reason}. You can upload a new certificate any time.
            </p>
          )}

          <h2 className="mt-6 text-sm font-semibold text-brand-navy">{live || pending ? 'Upload a new certificate' : 'Upload your certificate'}</h2>
          <div className="mt-3">
            <InsuranceForm />
          </div>
        </div>
      </div>
    </main>
  )
}
