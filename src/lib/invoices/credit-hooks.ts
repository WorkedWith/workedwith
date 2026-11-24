import type { createAdminClient } from '@/lib/supabase/admin'
import type { CreditNote } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/** After a credit note is issued. Phase 11 queues the accounting sync. */
export async function onCreditNoteIssued(admin: AdminClient, cn: CreditNote): Promise<void> {
  void admin
  void cn
}
