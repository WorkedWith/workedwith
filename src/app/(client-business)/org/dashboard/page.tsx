import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/org-access'

export const metadata = { title: 'Business dashboard | WorkedWith' }

function Tile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-navy">{value}</p>
    </Link>
  )
}

export default async function OrgDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const admin = createAdminClient()
  const ctx = await getOrgContext(admin, user.id)
  if (!ctx) redirect('/dashboard')

  const { data: cp } = await admin.from('client_profiles').select('id, average_rating, total_reviews, total_jobs, red_flag_count').eq('user_id', ctx.identityUserId).maybeSingle()
  const profile = cp as { id: string; average_rating: number; total_reviews: number; total_jobs: number; red_flag_count: number } | null
  const [{ count: members }, { count: waiting }, { count: unanswered }] = await Promise.all([
    admin.from('organisation_members').select('id', { count: 'exact', head: true }).eq('organisation_id', ctx.org.id),
    profile
      ? admin.from('jobs').select('id', { count: 'exact', head: true }).eq('client_profile_id', profile.id).eq('status', 'pending_confirmation')
      : Promise.resolve({ count: 0 }),
    admin.from('reviews').select('id', { count: 'exact', head: true }).eq('reviewee_id', ctx.identityUserId).eq('reviewee_type', 'client').eq('is_visible', true).is('response_text', null),
  ])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-brand-navy">{ctx.org.company_name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {ctx.org.companies_house_verified ? 'Companies House verified' : 'Not yet verified'} · Company number {ctx.org.companies_house_number}
        {ctx.org.company_status ? ` · ${ctx.org.company_status}` : ''}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Tile label="Jobs" value={String(profile?.total_jobs ?? 0)} href="/org/jobs" />
        <Tile label="Rating" value={profile && profile.total_reviews > 0 ? `${Number(profile.average_rating).toFixed(1)} / 5` : 'None yet'} href="/org/reviews" />
        <Tile label="Reviews to answer" value={String(unanswered ?? 0)} href="/org/reviews" />
        <Tile label="Waiting on a trade" value={String(waiting ?? 0)} href="/org/jobs" />
      </div>
      {profile && profile.red_flag_count > 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {profile.red_flag_count} {profile.red_flag_count === 1 ? 'review has' : 'reviews have'} raised a red flag. Trades on Standard and Pro see this when they look you up.
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/org/members" className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">{ctx.canManage ? 'Manage members' : 'Members'} ({members ?? 0})</Link>
        <Link href="/dashboard" className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Log or add a job</Link>
        <Link href="/profile" className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Business profile</Link>
      </div>
    </main>
  )
}
