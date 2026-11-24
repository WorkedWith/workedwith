import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Approved variations added to a stage, for invoices (PRD 8, 11). */
export async function approvedVariationsForStage(admin: AdminClient, stageId: string): Promise<{ description: string; amountPence: number }[]> {
  const { data } = await admin.from('variations').select('description, amount_pence').eq('applied_to_stage_id', stageId).eq('status', 'approved').order('decided_at')
  return (data ?? []).map(v => ({ description: v.description as string, amountPence: v.amount_pence as number }))
}
