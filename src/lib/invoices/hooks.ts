import type { createAdminClient } from '@/lib/supabase/admin'
import { enqueueSync } from '@/lib/accounting/sync'
import type { Invoice } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** After an invoice is issued: send it to the trade's accounting software (PRD 12). */
export async function onInvoiceIssued(admin: AdminClient, invoice: Invoice): Promise<void> {
  await enqueueSync(admin, invoice.trade_id, 'invoice', invoice.id, invoice.issued_at)
}
