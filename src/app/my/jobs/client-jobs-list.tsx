import { createAdminClient } from '@/lib/supabase/admin'
import { formatPence } from '@/lib/money'
import { nextStepForClient } from '@/lib/jobs/client-status'
import { plannedStartShort } from '@/lib/jobs/status'
import type { PaymentStage, Quote } from '@/types/v42'

/** Each job with planned start, progress, paid so far and what is due next (PRD 18). */
export async function ClientJobsList({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const { data: jobs } = await admin
    .from('jobs')
    .select('id, title, status, agreed_start_date, current_quote_id, total_pence, trade_user_id, created_at')
    .eq('flow', 'quote')
    .eq('client_user_id', userId)
    .order('created_at', { ascending: false })
  const ids = (jobs ?? []).map(j => j.id as string)
  if (ids.length === 0) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">No jobs yet. When a trade sends you a quote it will appear here.</div>
  }
  const tradeIds = Array.from(new Set((jobs ?? []).map(j => j.trade_user_id as string)))
  const [{ data: quotes }, { data: stages }, { data: trades }] = await Promise.all([
    admin.from('quotes').select('id, job_id, status, deposit_required, planned_start_type, planned_start_date, total_pence').in('job_id', ids).neq('status', 'draft'),
    admin.from('payment_stages').select('job_id, status, name, is_deposit, amount_paid_pence').in('job_id', ids),
    admin.from('trade_profiles').select('user_id, company_name').in('user_id', tradeIds),
  ])
  const tradeName = new Map((trades ?? []).map(t => [t.user_id as string, (t.company_name as string | null) ?? 'Your trade']))
  const qById = new Map(((quotes ?? []) as unknown as Quote[]).map(q => [q.id, q]))
  const stagesBy = new Map<string, PaymentStage[]>()
  for (const s of (stages ?? []) as unknown as PaymentStage[]) stagesBy.set(s.job_id, [...(stagesBy.get(s.job_id) ?? []), s])

  return (
    <ul className="space-y-3">
      {(jobs ?? []).map(j => {
        const q = qById.get(j.current_quote_id as string) ?? null
        if (!q) return null
        const st = stagesBy.get(j.id as string) ?? []
        const paid = st.reduce((s, x) => s + x.amount_paid_pence, 0)
        const total = (j.total_pence as number | null) ?? q.total_pence
        const href = j.status === 'quoted' && q.status !== 'accepted' ? `/my/quotes/${q.id}` : `/my/jobs/${j.id}`
        const next = nextStepForClient(j.status as string, q, st)
        return (
          <li key={j.id as string}>
            <a href={href} className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-brand-amber">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{tradeName.get(j.trade_user_id as string)}</p>
                  <p className="font-semibold text-brand-navy">{j.title as string}</p>
                </div>
                <span className="shrink-0 text-base font-bold tabular-nums">{formatPence(total)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                <div className="h-full bg-brand-amber" style={{ width: `${total ? Math.min(100, Math.round((paid / total) * 100)) : 0}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-gray-600">Planned start: {plannedStartShort(q.planned_start_type, q.planned_start_date, j.agreed_start_date as string | null)}</span>
                <span className="text-gray-600">Paid {formatPence(paid)}</span>
              </div>
              {next && <p className="mt-2 text-sm font-semibold text-brand-navy">{next}</p>}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
