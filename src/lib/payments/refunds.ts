import type { createAdminClient } from '@/lib/supabase/admin'
import { issueCreditNote } from '@/lib/invoices/credit-notes'

type AdminClient = ReturnType<typeof createAdminClient>

/** A refund needs a credit note against the invoice it was paid on (PRD 9, 11). */
export async function recordRefundCredit(admin: AdminClient, paymentId: string, amountPence: number): Promise<void> {
  const { data: p } = await admin.from('payments').select('invoice_id').eq('id', paymentId).maybeSingle()
  if (!p?.invoice_id) return
  await issueCreditNote(admin, { invoiceId: p.invoice_id, amountPence, reason: 'Refund', kind: 'refund', paymentId })
}
