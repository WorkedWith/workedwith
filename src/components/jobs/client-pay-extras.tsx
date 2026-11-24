import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Pay by card, when the trade accepts cards. Filled in by phase 13. */
export async function ClientPayExtras(props: { admin: AdminClient; stageId: string; tradeUserId: string; balancePence: number }) {
  void props
  return null
}
