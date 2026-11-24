import type { createAdminClient } from '@/lib/supabase/admin'
import type { Invoice } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** After an invoice is issued. Phase 11 queues the accounting sync here. */
export async function onInvoiceIssued(admin: AdminClient, invoice: Invoice): Promise<void> {
  void admin
  void invoice
}
