import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Accounting sync status for one record. Phase 11 fills this in. */
export async function SyncStatus(props: { admin: AdminClient; entityType: 'invoice' | 'payment' | 'credit_note'; entityId: string }) {
  void props
  return null
}
