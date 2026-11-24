import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Audit of trades seeing a client's record (PRD 14, 21). The table arrives in phase 9. */
export async function recordClientRecordView(
  admin: AdminClient,
  p: { tradeId: string; clientId: string; reason: 'quoting' | 'lookup'; jobId?: string | null },
): Promise<void> {
  void admin
  void p
}
