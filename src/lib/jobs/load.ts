import type { createAdminClient } from '@/lib/supabase/admin'
import type { Job } from '@/types/database'
import type { PaymentStage, Quote } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type JobBundle = { job: Job; quotes: Quote[]; current: Quote | null; stages: PaymentStage[] }

/** A v4.2 job with its quote versions and stages, if `userId` is the trade or the client on it. */
export async function loadJob(admin: AdminClient, jobId: string, userId: string, as: 'trade' | 'client'): Promise<JobBundle | null> {
  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (!job || job.flow !== 'quote') return null
  if (as === 'trade' && job.trade_user_id !== userId) return null
  if (as === 'client' && job.client_user_id !== userId) return null
  const [{ data: quotes }, { data: stages }] = await Promise.all([
    admin.from('quotes').select('*').eq('job_id', jobId).order('version', { ascending: false }),
    admin.from('payment_stages').select('*').eq('job_id', jobId).order('position'),
  ])
  const qs = (quotes ?? []) as Quote[]
  const visible = as === 'client' ? qs.filter(q => q.status !== 'draft') : qs
  const current = visible.find(q => q.id === job.current_quote_id) ?? visible.find(q => q.status === 'accepted') ?? visible[0] ?? null
  return { job: job as unknown as Job, quotes: visible, current, stages: (stages ?? []) as PaymentStage[] }
}
