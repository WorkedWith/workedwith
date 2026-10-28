import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/org-access'
import { jobLabel } from '@/lib/trade-types'
import { BackLink } from '@/components/back-link'

export const metadata = { title: 'Business jobs | WorkedWith' }

const STATUS: Record<string, string> = {
  pending_confirmation: 'Waiting for confirmation',
  active: 'Under way',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
  ended_early: 'Ended early',
}

export default async function OrgJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const admin = createAdminClient()
  const ctx = await getOrgContext(admin, user.id)
  if (!ctx) redirect('/dashboard')

  const { data: cp } = await admin.from('client_profiles').select('id').eq('user_id', ctx.identityUserId).maybeSingle()
  const { data: rows } = cp
    ? await admin
        .from('jobs')
        .select('id, job_type, postcode, status, trade_profile_id, started_at, completed_at, created_at')
        .eq('client_profile_id', (cp as { id: string }).id)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }
  const jobs = (rows ?? []) as unknown as { id: string; job_type: string; postcode: string | null; status: string; trade_profile_id: string | null; created_at: string }[]

  const tradeIds = Array.from(new Set(jobs.map(j => j.trade_profile_id).filter((x): x is string => !!x)))
  const { data: trades } = tradeIds.length
    ? await admin.from('trade_profiles').select('id, company_name, user_id').in('id', tradeIds)
    : { data: [] }
  const nameOf = new Map(((trades ?? []) as unknown as { id: string; company_name: string | null }[]).map(t => [t.id, t.company_name ?? 'A tradesperson']))

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <BackLink href="/org/dashboard" label="Business dashboard" />
      <h1 className="mt-2 text-2xl font-bold text-brand-navy">{ctx.org.company_name}: jobs</h1>
      <p className="mt-1 text-sm text-gray-600">Every job logged against the business. Any verified team member can confirm, update and review these jobs in the business&apos;s name. We record who did it.</p>
      {jobs.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          No jobs yet. When a tradesperson logs a job with the business, or you add a past one, it shows here.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {jobs.map(j => (
            <li key={j.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">{jobLabel(j.job_type)}{j.postcode ? ` · ${j.postcode}` : ''}</p>
                <p className="text-xs text-gray-500">{nameOf.get(j.trade_profile_id ?? '') ?? 'A tradesperson'} · {new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-gray-600">{STATUS[j.status] ?? j.status}</span>
                {j.status === 'completed' || j.status === 'ended_early' ? (
                  <a href={`/jobs/${j.id}/review`} className="block text-xs font-semibold text-brand-navy underline">Review</a>
                ) : null}
                {j.status === 'active' || j.status === 'ended_early' ? (
                  <a href={`/jobs/${j.id}/status`} className="block text-xs font-semibold text-brand-navy underline">Update</a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
