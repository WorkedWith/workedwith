import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export type WindowReason = 'paid' | 'overdue_30_days' | 'cancelled_after_start'

/** Open the 14 day review window for both sides (PRD 13). Phase 9 fills this in. */
export async function openReviewWindow(admin: AdminClient, jobId: string, reason: WindowReason): Promise<void> {
  void admin
  void jobId
  void reason
}
