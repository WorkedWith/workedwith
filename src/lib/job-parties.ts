import { createAdminClient } from '@/lib/supabase/admin'
import type { Job } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

export type JobParties = {
  job: Job
  tradeUserId: string | null
  clientUserId: string | null
  tradeName: string
  clientName: string
  tradeEmail: string | null
  clientEmail: string | null
}

/** Both people on a job, with the names the other side would recognise. */
export async function loadJobParties(admin: AdminClient, jobId: string): Promise<JobParties | null> {
  const { data: raw } = await admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  const job = raw as unknown as Job | null
  if (!job) return null

  const [{ data: tp }, { data: cp }] = await Promise.all([
    job.trade_profile_id ? admin.from('trade_profiles').select('user_id, company_name').eq('id', job.trade_profile_id).maybeSingle() : Promise.resolve({ data: null }),
    job.client_profile_id ? admin.from('client_profiles').select('user_id, display_name, company_name').eq('id', job.client_profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const tradeUserId = (tp?.user_id as string | undefined) ?? null
  const clientUserId = (cp?.user_id as string | undefined) ?? null
  const ids = [tradeUserId, clientUserId].filter((x): x is string => !!x)
  const { data: users } = ids.length ? await admin.from('users').select('id, full_name, email').in('id', ids) : { data: [] }
  const u = (id: string | null) => ((users ?? []) as unknown as { id: string; full_name: string; email: string | null }[]).find(x => x.id === id)

  return {
    job,
    tradeUserId,
    clientUserId,
    tradeName: (tp?.company_name as string | null) ?? u(tradeUserId)?.full_name ?? 'Your tradesperson',
    clientName: (cp?.display_name as string | null) ?? (cp?.company_name as string | null) ?? u(clientUserId)?.full_name ?? 'Your client',
    tradeEmail: u(tradeUserId)?.email ?? null,
    clientEmail: u(clientUserId)?.email ?? null,
  }
}
