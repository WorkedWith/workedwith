import type { createAdminClient } from '@/lib/supabase/admin'
import { enqueueSync } from '@/lib/accounting/sync'
import type { Payment } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** After a payment is recorded: sync it. Paid elsewhere waits for the client to confirm (PRD 12). */
export async function onPaymentRecorded(admin: AdminClient, payment: Payment): Promise<void> {
  const { data: job } = await admin.from('jobs').select('trade_user_id').eq('id', payment.job_id).maybeSingle()
  if (job?.trade_user_id) await enqueueSync(admin, job.trade_user_id as string, 'payment', payment.id, payment.paid_at)
}
