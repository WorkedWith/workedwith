import type { createAdminClient } from '@/lib/supabase/admin'
import { enqueueSync } from '@/lib/accounting/sync'
import type { CreditNote } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** After a credit note is issued: sync it, and the refund it records if there is one (PRD 12). */
export async function onCreditNoteIssued(admin: AdminClient, cn: CreditNote): Promise<void> {
  await enqueueSync(admin, cn.trade_id, 'credit_note', cn.id, cn.issued_at)
  if (cn.payment_id) await enqueueSync(admin, cn.trade_id, 'refund', cn.payment_id, cn.issued_at)
}
