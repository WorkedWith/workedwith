import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import { clientLookupName } from '@/lib/lookup'
import { confirmationLabel } from '@/lib/request-outcomes'
import { endedEarlyLabel, getOutcomeLabels } from '@/lib/job-outcome'

export const metadata: Metadata = { title: 'A client profile | WorkedWith', robots: { index: false, follow: false } }

type Props = { params: { token: string } }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      {children}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-brand-navy">{value}</p>
    </div>
  )
}

export default async function ClientSharePage({ params }: Props) {
  const admin = createAdminClient()
  const { data: link } = await admin.from('client_share_links').select('*').eq('token', params.token).maybeSingle()

  if (!link || link.revoked_at || new Date(link.expires_at as string) < new Date()) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-brand-navy">This link isn&apos;t working</h1>
        <p className="mt-2 text-gray-600">It has expired or been switched off. Ask the client to send you a new one.</p>
      </Shell>
    )
  }

  const clientUserId = link.client_user_id as string
  const [{ data: cp }, { data: cu }] = await Promise.all([
    admin.from('client_profiles').select('*').eq('user_id', clientUserId).maybeSingle(),
    admin.from('users').select('created_at, verification_tier').eq('id', clientUserId).maybeSingle(),
  ])
  if (!cp || !cu) {
    return <Shell><h1 className="text-2xl font-bold text-brand-navy">Profile not found</h1></Shell>
  }

  // Who is looking? Only a signed in trade gets more than the summary.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let viewerIsTrade = false
  let fullAccess = false
  if (user) {
    const { data: me } = await admin.from('users').select('user_type').eq('id', user.id).maybeSingle()
    viewerIsTrade = me?.user_type === 'trade' || me?.user_type === 'both'
    if (viewerIsTrade) fullAccess = isStandardOrAbove(await getUserTier(user.id))
  }

  // Counted, with no identities. Does not touch anyone's lookup allowance.
  await admin.rpc('bump_share_link', { p_id: link.id as string, p_trade: viewerIsTrade })

  const name = clientLookupName({
    client_type: cp.client_type as string | null,
    company_name: cp.company_name as string | null,
    display_name: cp.display_name as string | null,
  }) ?? 'This client'
  const rating = Number(cp.average_rating ?? 0)
  const reviews = (cp.total_reviews as number) ?? 0
  const jobs = (cp.total_jobs as number) ?? 0
  const conf = confirmationLabel(cp.confirmation_counted as number | null, cp.confirmation_confirmed as number | null)
  const ended = endedEarlyLabel(cp.ended_early_count as number | null, jobs)
  const since = new Date(cu.created_at as string).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const idChecked = cu.verification_tier === 'fully_verified'

  let recent: { overall_rating: number | null; written_review: string | null; submitted_at: string; job_id: string }[] = []
  let outcome = new Map<string, string>()
  if (viewerIsTrade && fullAccess) {
    const { data } = await admin
      .from('reviews')
      .select('overall_rating, written_review, submitted_at, job_id')
      .eq('reviewee_id', clientUserId)
      .eq('reviewee_type', 'client')
      .eq('is_visible', true)
      .order('submitted_at', { ascending: false })
      .limit(5)
    recent = (data ?? []) as unknown as typeof recent
    outcome = await getOutcomeLabels(admin, recent.map(r => r.job_id))
  }

  return (
    <Shell>
      <div className="rounded-2xl bg-brand-navy p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-amber">WorkedWith client profile</p>
        <h1 className="mt-2 text-2xl font-bold">{name}</h1>
        <p className="mt-1 text-sm text-white/70">
          {reviews === 0 ? 'No reviews yet' : `${rating.toFixed(1)} out of 5 from ${reviews} review${reviews === 1 ? '' : 's'}`}
        </p>
        {idChecked && <p className="mt-3 inline-block rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-200">ID verified</p>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Client score" value={reviews === 0 ? 'None yet' : `${rating.toFixed(1)} / 5`} />
        <Stat label="Confirmed jobs" value={String(jobs)} />
        <Stat label="Member since" value={since} />
        {conf && <Stat label="Job requests" value={conf.replace('Confirmed ', '')} />}
      </div>
      {ended && <p className="mt-3 text-xs text-gray-500">{ended}</p>}

      {viewerIsTrade && fullAccess && (
        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-brand-navy">How they work with trades</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="Pays on time" value={`${Number(cp.payment_reliability_score ?? 0).toFixed(1)}`} />
            <Stat label="Communication" value={`${Number(cp.communication_score ?? 0).toFixed(1)}`} />
            <Stat label="Clear scope" value={`${Number(cp.scope_clarity_score ?? 0).toFixed(1)}`} />
          </div>
          <p className="mt-3 text-sm text-gray-600">Red flags: <strong>{(cp.red_flag_count as number) ?? 0}</strong></p>
          {recent.filter(r => r.written_review).length > 0 && (
            <div className="mt-4 space-y-3">
              {recent.filter(r => r.written_review).map((r, i) => (
                <div key={i} className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400">
                    {new Date(r.submitted_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    {outcome.get(r.job_id) ? ` · ${outcome.get(r.job_id)}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">{r.written_review}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {viewerIsTrade && !fullAccess && (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Upgrade to Standard to see payment history, red flags and written reviews.{' '}
          <a href="/subscription" className="font-semibold underline">See plans</a>
        </p>
      )}

      {!viewerIsTrade && (
        <p className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
          Are you a trade? <a href={`/join/trade?next=${encodeURIComponent(`/c/share/${params.token}`)}`} className="font-semibold text-brand-navy underline">Join free to see full reviews.</a>
        </p>
      )}
    </Shell>
  )
}
