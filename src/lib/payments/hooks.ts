import type { createAdminClient } from '@/lib/supabase/admin'
import type { Payment } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** After a payment is recorded or confirmed. Phase 11 queues the accounting sync. */
export async function onPaymentRecorded(admin: AdminClient, payment: Payment): Promise<void> {
  void admin
  void payment
}
