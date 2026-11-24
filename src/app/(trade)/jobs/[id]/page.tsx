import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadJob } from '@/lib/jobs/load'
import { JOB_STATUS_LABEL, nextStepForTrade } from '@/lib/jobs/status'
import { formatPence } from '@/lib/money'
import { getTradeSender } from '@/lib/messages/send'
import { Notice, PageShell, Pill } from '@/components/ui'
import { TradeQuotePanel } from '@/components/jobs/trade-quote-panel'
import { ClientRecordPanel } from '@/components/jobs/client-record-panel'
import { TradeJobSections } from '@/components/jobs/trade-job-sections'
import { LegacyJobView } from './legacy-job-view'
import { JobTimeline } from '@/components/jobs/job-timeline'

export const metadata = { title: 'Job | WorkedWith' }

export default async function JobPage({ params, searchParams }: { params: { id: string }; searchParams: { sent?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()

  const { data: flowRow } = await admin.from('jobs').select('flow').eq('id', params.id).maybeSingle()
  if (!flowRow) notFound()
  if (flowRow.flow !== 'quote') return <LegacyJobView params={params} />

  const bundle = await loadJob(admin, params.id, user.id, 'trade')
  if (!bundle) notFound()
  const { job, current } = bundle
  const sender = await getTradeSender(admin, user.id)

  return (
    <PageShell width="max-w-5xl">
      <a href="/jobs" className="inline-flex min-h-[44px] items-center text-sm font-medium text-gray-500">‹ Jobs</a>
      {searchParams.sent && <Notice tone="green">Quote sent by text and email. You will be told when the client opens it.</Notice>}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{job.title ?? 'Job'}</h1>
          <p className="text-sm text-gray-600">{current ? (current.client_company_name ? `${current.client_company_name}, ${current.client_name}` : current.client_name) : ''}{job.job_address ? ` · ${job.job_address}` : ''}</p>
          <p className="mt-1 text-sm font-medium text-gray-800">{nextStepForTrade(job, current, bundle.stages)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="blue">{JOB_STATUS_LABEL[job.status] ?? job.status}</Pill>
          <span className="text-lg font-bold tabular-nums text-brand-navy">{formatPence(job.total_pence ?? current?.total_pence ?? 0)}</span>
        </div>
      </header>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <TradeJobSections admin={admin} bundle={bundle} userId={user.id} />
          <TradeQuotePanel admin={admin} bundle={bundle} businessName={sender.businessName} />
        </div>
        <div className="space-y-5">
          <ClientRecordPanel admin={admin} clientUserId={job.client_user_id} />
          <JobTimeline admin={admin} jobId={job.id} />
        </div>
      </div>
    </PageShell>
  )
}
