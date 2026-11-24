import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadJob } from '@/lib/jobs/load'
import { nextStepForClient } from '@/lib/jobs/client-status'
import { plannedStartWording } from '@/lib/quotes/wording'
import { getTradeSender } from '@/lib/messages/send'
import { formatPence } from '@/lib/money'
import { Notice } from '@/components/ui'
import { ClientJobSections } from '@/components/jobs/client-job-sections'
import { JobTimeline } from '@/components/jobs/job-timeline'

export const metadata = { title: 'Your job | WorkedWith', robots: { index: false } }

/** One page per job for the client (PRD 5, 18). Phone first. */
export default async function ClientJobPage({ params, searchParams }: { params: { id: string }; searchParams: { accepted?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in/code?next=/my/jobs/${params.id}`)
  const admin = createAdminClient()
  const bundle = await loadJob(admin, params.id, user.id, 'client')
  if (!bundle) notFound()
  const { job, current, stages } = bundle
  if (current && job.status === 'quoted' && current.status !== 'accepted') redirect(`/my/quotes/${current.id}`)
  const sender = await getTradeSender(admin, job.trade_user_id ?? '')
  const total = job.total_pence ?? current?.total_pence ?? 0
  const paid = stages.reduce((s, x) => s + x.amount_paid_pence, 0)

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-28 pt-5">
      {searchParams.accepted && <Notice tone="green">Thanks, you have accepted the quote. {current?.deposit_required ? 'Pay the deposit below to book the job in.' : 'The job is booked.'}</Notice>}
      <header className="rounded-2xl bg-brand-navy p-5 text-white">
        <p className="text-sm text-white/70">{sender.businessName}</p>
        <h1 className="mt-1 text-xl font-bold">{job.title}</h1>
        <p className="mt-2 text-sm text-white/80">{job.agreed_start_date ? plannedStartWording('date', job.agreed_start_date) : current ? plannedStartWording(current.planned_start_type, current.planned_start_date) : ''}</p>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm text-white/70">Paid {formatPence(paid)} of {formatPence(total)}</span>
          <span className="text-sm font-semibold text-brand-amber">{nextStepForClient(job.status, current, stages)}</span>
        </div>
      </header>
      <ClientJobSections admin={admin} bundle={bundle} userId={user.id} />
      <JobTimeline admin={admin} jobId={job.id} />
      {current && <a href={`/my/quotes/${current.id}`} className="block min-h-[48px] rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-brand-navy">See the accepted quote and terms ›</a>}
    </main>
  )
}
