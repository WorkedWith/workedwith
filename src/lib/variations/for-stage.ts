import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Approved variations added to a stage. Phase 7 fills this in. */
export async function approvedVariationsForStage(admin: AdminClient, stageId: string): Promise<{ description: string; amountPence: number }[]> {
  void admin
  void stageId
  return []
}
