import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/org-access'
import { jobLabel } from '@/lib/trade-types'
import { BackLink } from '@/components/back-link'

export const metadata = { title: 'Business profile | WorkedWith' }

export default async function OrgProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const admin = createAdminClient()
  const ctx = await getOrgContext(admin, user.id)
  if (!ctx) redirect('/dashboard')

  const { data: cp } = await admin.from('client_profiles').select('id, username, average_rating, total_reviews, total_jobs').eq('user_id', ctx.identityUserId).maybeSingle()
  const profile = cp as { id: string; username: string | null; average_rating: number; total_reviews: number; total_jobs: number } | null

  const [{ data: holder }, { data: jobRows }, { data: reviewRows }] = await Promise.all([
    admin.from('users').select('full_name, email').eq('id', ctx.identityUserId).maybeSingle(),
    profile
      ? admin.from('jobs').select('id, job_type, confirmed_at, confirmed_by_user_id').eq('client_profile_id', profile.id).not('confirmed_by_user_id', 'is', null).order('confirmed_at', { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
    admin.from('reviews').select('id, job_id, created_at, submitted_by_user_id').eq('reviewer_id', ctx.identityUserId).eq('reviewer_type', 'client').not('submitted_by_user_id', 'is', null).order('created_at', { ascending: false }).limit(10),
  ])
  const holderRow = holder as { full_name: string; email: string | null } | null
  const jobs = (jobRows ?? []) as unknown as { id: string; job_type: string; confirmed_at: string | null; confirmed_by_user_id: string }[]
  const reviews = (reviewRows ?? []) as unknown as { id: string; created_at: string; submitted_by_user_id: string }[]

  const ids = Array.from(new Set([...jobs.map(j => j.confirmed_by_user_id), ...reviews.map(r => r.submitted_by_user_id)]))
  const { data: people } = ids.length ? await admin.from('users').select('id, full_name').in('id', ids) : { data: [] }
  const nameOf = new Map(((people ?? []) as unknown as { id: string; full_name: string }[]).map(p => [p.id, p.full_name]))
  const when = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  const activity = [
    ...jobs.map(j => ({ key: `j${j.id}`, at: j.confirmed_at, text: `${nameOf.get(j.confirmed_by_user_id) ?? 'A team member'} confirmed a ${jobLabel(j.job_type)} job` })),
    ...reviews.map(r => ({ key: `r${r.id}`, at: r.created_at, text: `${nameOf.get(r.submitted_by_user_id) ?? 'A team member'} left a review` })),
  ].sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime()).slice(0, 10)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <BackLink href="/org/dashboard" label="Business dashboard" />
      <h1 className="mt-2 text-2xl font-bold text-brand-navy">{ctx.org.company_name}</h1>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Company</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Companies House number</dt><dd className="font-medium text-gray-800">{ctx.org.companies_house_number}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Verification</dt><dd className="font-medium text-gray-800">{ctx.org.companies_house_verified ? `Verified${ctx.org.companies_house_verified_at ? ` on ${when(ctx.org.companies_house_verified_at)}` : ''}` : 'Not yet verified'}</dd></div>
          {ctx.org.company_status && <div className="flex justify-between gap-4"><dt className="text-gray-500">Status</dt><dd className="font-medium text-gray-800">{ctx.org.company_status}</dd></div>}
          {ctx.org.registered_postcode && <div className="flex justify-between gap-4"><dt className="text-gray-500">Registered postcode</dt><dd className="font-medium text-gray-800">{ctx.org.registered_postcode}</dd></div>}
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Record</h2>
        <p className="mt-2 text-sm text-gray-600">
          {profile ? `${profile.total_jobs} ${profile.total_jobs === 1 ? 'job' : 'jobs'}, ${profile.total_reviews > 0 ? `${Number(profile.average_rating).toFixed(1)} out of 5 from ${profile.total_reviews} ${profile.total_reviews === 1 ? 'review' : 'reviews'}` : 'no reviews yet'}.` : 'No record yet.'}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          The business record is held by {holderRow?.full_name ?? 'the primary contact'}. Any verified team member can confirm and review jobs in the business&apos;s name. Only owners and admins can answer reviews or raise disputes.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Recent team activity</h2>
        {activity.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nothing yet. When a team member confirms a job or leaves a review, it shows here.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {activity.map(a => (
              <li key={a.key} className="flex justify-between gap-3 py-2"><span className="text-gray-700">{a.text}</span><span className="shrink-0 text-xs text-gray-400">{when(a.at)}</span></li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
