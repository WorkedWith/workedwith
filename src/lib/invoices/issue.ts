import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Phase 6 fills this in. */
export async function issueInvoiceForStage(_admin: AdminClient, _stageId: string): Promise<void> {
  void _admin
  void _stageId
}
