import type { createAdminClient } from '@/lib/supabase/admin'
import type { PaymentStage } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** Stages a variation can be added to: not the deposit, and not yet due, paid or cancelled. */
export async function variationTargets(admin: AdminClient, jobId: string): Promise<PaymentStage[]> {
  const { data } = await admin.from('payment_stages').select('*').eq('job_id', jobId).eq('is_deposit', false).in('status', ['upcoming', 'awaiting_approval', 'issue_raised']).order('position')
  return (data ?? []) as PaymentStage[]
}
