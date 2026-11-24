import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** The trade who issued it, or the client on the job. Admins too (disputes). */
export async function canSeeInvoice(admin: AdminClient, userId: string, invoice: { trade_id: string; job_id: string }): Promise<boolean> {
  if (invoice.trade_id === userId) return true
  const { data: job } = await admin.from('jobs').select('client_user_id').eq('id', invoice.job_id).maybeSingle()
  if (job?.client_user_id === userId) return true
  const { data: u } = await admin.from('users').select('is_admin').eq('id', userId).maybeSingle()
  return !!u?.is_admin
}
