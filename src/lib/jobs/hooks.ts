import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Called whenever a stage becomes due (deposit on acceptance, approved, or requested by the trade).
 * Phase 6 issues the invoice here; phase 11 queues the accounting sync.
 */
export async function onStageDue(admin: AdminClient, stageId: string): Promise<void> {
  const { issueInvoiceForStage } = await import('@/lib/invoices/issue')
  await issueInvoiceForStage(admin, stageId)
}
