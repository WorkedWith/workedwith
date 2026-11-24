import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** A refund needs a credit note (PRD 9, 11). Phase 6 issues it here. */
export async function recordRefundCredit(admin: AdminClient, paymentId: string, amountPence: number): Promise<void> {
  void admin
  void paymentId
  void amountPence
}
