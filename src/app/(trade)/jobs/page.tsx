import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPence } from '@/lib/money'
import { jobFilterOf, nextStepForTrade, plannedStartShort, JOB_STATUS_LABEL, type JobFilter } from '@/lib/jobs/status'
import { LinkButton, PageShell, Pill } from '@/components/ui'
import type { PaymentStage, Quote } from '@/types/v42'

export const metadata = { title: 'Jobs | WorkedWith' }

const FILTERS: { key: JobFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'booked', label: 'Booked' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'awaiting_payment', label: 'Awaiting payment' },
  { key: 'paid', label: 'Paid' },
]

/** One list of quotes and jobs (PRD 18 Jobs). */
export default async function JobsPage({ searchParams }: { searchParams: { f?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const filter = (FILTERS.find(f => f.key === searchParams.f)?.key ?? 'all') as JobFilter

  const { data: jobs } = await admin
    .from('jobs')
    .select('id, title, status, agreed_start_date, started_at, current_quote_id, total_pence, created_at')
    .eq('flow', 'quote')
    .eq('trade_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)
  const ids = (jobs ?? []).map(j => j.id as string)
  const [{ data: quotes }, { data: stages }] = await Promise.all([
    ids.length ? admin.from('quotes').select('id, job_id, status, deposit_required, client_name, client_company_name, planned_start_type, planned_start_date, total_pence').in('job_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from('payment_stages').select('job_id, status, is_deposit, name, position').in('job_id', ids).order('position') : Promise.resolve({ data: [] }),
  ])
  const quoteById = new Map((quotes ?? []).map(q => [q.id as string, q as unknown as Quote]))
  const latestByJob = new Map<string, Quote>()
  for (const q of (quotes ?? []) as unknown as Quote[]) if (!latestByJob.has(q.job_id)) latestByJob.set(q.job_id, q)
  const stagesByJob = new Map<string, PaymentStage[]>()
  for (const s of (stages ?? []) as unknown as PaymentStage[]) stagesByJob.set(s.job_id, [...(stagesByJob.get(s.job_id) ?? []), s])

  const rows = (jobs ?? []).map(j => {
    const q = (j.current_quote_id ? quoteById.get(j.current_quote_id as string) : null) ?? latestByJob.get(j.id as string) ?? null
    const st = stagesByJob.get(j.id as string) ?? []
    return {
      id: j.id as string,
      title: (j.title as string | null) ?? 'Job',
      client: q ? (q.client_company_name ?? q.client_name) : '',
      status: j.status as string,
      filter: jobFilterOf({ status: j.status as never }, st),
      start: plannedStartShort(q?.planned_start_type, q?.planned_start_date, j.agreed_start_date as string | null),
      next: nextStepForTrade({ status: j.status as never, agreed_start_date: j.agreed_start_date as string | null, started_at: j.started_at as string | null }, q, st),
      total: (j.total_pence as number | null) ?? q?.total_pence ?? 0,
    }
  }).filter(r => filter === 'all' || r.filter === filter)

  return (
    <PageShell width="max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">Jobs</h1>
        <LinkButton href="/quotes/new">New quote</LinkButton>
      </div>
      <nav aria-label="Filter jobs" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTERS.map(f => (
          <a key={f.key} href={f.key === 'all' ? '/jobs' : `/jobs?f=${f.key}`} aria-current={filter === f.key ? 'page' : undefined}
            className={`flex min-h-[40px] shrink-0 items-center rounded-full px-4 text-sm font-semibold ${filter === f.key ? 'bg-brand-navy text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'}`}>
            {f.label}
          </a>
        ))}
      </nav>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Nothing here yet.</p>
          <LinkButton href="/quotes/new" className="mt-4">Send your first quote</LinkButton>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {rows.map(r => (
            <li key={r.id}>
              <a href={`/jobs/${r.id}`} className="block px-4 py-3.5 hover:bg-gray-50 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
                <div className="sm:col-span-5">
                  <p className="font-semibold text-brand-navy">{r.title}</p>
                  <p className="text-sm text-gray-500">{r.client}</p>
                </div>
                <p className="mt-1 text-sm text-gray-700 sm:col-span-4 sm:mt-0">{r.next}</p>
                <div className="mt-2 flex items-center justify-between gap-2 sm:col-span-3 sm:mt-0 sm:justify-end">
                  <span className="text-xs text-gray-500">Start: {r.start}</span>
                  <span className="flex items-center gap-2"><Pill tone={r.status === 'paid' ? 'green' : r.status === 'cancelled' ? 'grey' : 'blue'}>{JOB_STATUS_LABEL[r.status] ?? r.status}</Pill><span className="text-sm font-semibold tabular-nums">{formatPence(r.total)}</span></span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  )
}
