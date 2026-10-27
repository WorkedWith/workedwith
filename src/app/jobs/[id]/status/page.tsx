import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/components/app-header'
import { BackLink } from '@/components/back-link'
import { loadJobParties } from '@/lib/job-parties'
import { jobLabel } from '@/lib/trade-types'
import { ENDED_EARLY_MIN_HOURS, OBJECTION_DAYS } from '@/lib/ended-early'
import { StatusActions } from './status-actions'

export const metadata = { title: 'Update this job | WorkedWith', robots: { index: false } }

export default async function JobStatusPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=/jobs/${params.id}/status`)

  const admin = createAdminClient()
  const p = await loadJobParties(admin, params.id)
  const isTrade = !!p && p.tradeUserId === user.id
  const isClient = !!p && p.clientUserId === user.id

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <BackLink href="/dashboard" label="Back to dashboard" />
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 text-sm leading-relaxed text-gray-600">
          {children}
        </div>
      </div>
    </main>
  )

  if (!p || (!isTrade && !isClient)) return shell(<><h1 className="text-xl font-bold text-brand-navy">Job not found</h1><p>We could not find that job.</p></>)

  const job = p.job
  const otherName = isTrade ? p.clientName : p.tradeName
  const label = jobLabel(job.job_type)
  const since = new Date(job.confirmed_at ?? job.created_at).getTime()
  const oldEnough = Date.now() - since >= ENDED_EARLY_MIN_HOURS * 3_600_000

  if (job.status === 'active') {
    return shell(
      <>
        <h1 className="text-xl font-bold text-brand-navy">Where is your {label} with {otherName}?</h1>
        {job.is_backdated && <p>This is a past job, so it cannot be marked as ended early. Say what happened in your review.</p>}
        {!job.is_backdated && !oldEnough && <p>A job needs to have been going for a day before it can be marked as ended early.</p>}
        <StatusActions
          mode="active"
          jobId={job.id}
          role={isTrade ? 'trade' : 'client'}
          otherName={otherName}
          canEnd={!job.is_backdated && oldEnough}
        />
      </>,
    )
  }

  if (job.status === 'ended_early') {
    const { data: details } = await admin.from('job_early_end_details').select('ended_by').eq('job_id', job.id).maybeSingle()
    const iEnded = (details?.ended_by as string | null | undefined) === user.id
    const endedAt = job.ended_early_at ? new Date(job.ended_early_at).getTime() : 0
    const canObject = !iEnded && !job.outcome_disputed && Date.now() - endedAt <= OBJECTION_DAYS * 86_400_000
    return shell(
      <>
        <h1 className="text-xl font-bold text-brand-navy">{job.outcome_disputed ? 'Outcome disputed' : 'This job is marked as ended early'}</h1>
        <p>
          {job.outcome_disputed
            ? `The ${label} shows as "Outcome disputed". Your reviews stay open, so say what happened in yours.`
            : `The ${label} with ${otherName} is marked as ended early. You can both leave a review.`}
        </p>
        <StatusActions mode="ended" jobId={job.id} canObject={canObject} role={isTrade ? 'trade' : 'client'} otherName={otherName} canEnd={false} />
      </>,
    )
  }

  return shell(
    <>
      <h1 className="text-xl font-bold text-brand-navy">Nothing to update</h1>
      <p>This job is {job.status === 'completed' ? 'complete' : job.status.replace(/_/g, ' ')}, so there is nothing to change here.</p>
    </>,
  )
}
