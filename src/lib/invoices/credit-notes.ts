import type { createAdminClient } from '@/lib/supabase/admin'
import { splitGross } from '@/lib/quotes/calc'
import { onCreditNoteIssued } from '@/lib/invoices/credit-hooks'
import type { CreditNote, Invoice } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Issue a credit note against an invoice (PRD 11). Used for refunds and for reductions after an invoice was
 * issued. The invoice itself is never edited, apart from becoming "credited" when fully credited.
 */
export async function issueCreditNote(admin: AdminClient, p: { invoiceId: string; amountPence: number; reason: string; kind: 'refund' | 'reduction'; paymentId?: string | null }): Promise<CreditNote | null> {
  const { data: inv } = await admin.from('invoices').select('*').eq('id', p.invoiceId).maybeSingle()
  const invoice = inv as Invoice | null
  if (!invoice || p.amountPence <= 0) return null
  const { data: alloc, error } = await admin.rpc('allocate_credit_note_number', { p_trade: invoice.trade_id })
  const row = alloc?.[0]
  if (error || !row) {
    console.error('Credit note number allocation failed:', error)
    return null
  }
  const split = splitGross(p.amountPence, invoice.net_pence, invoice.vat_pence)
  const { data: cn } = await admin.from('credit_notes').insert({
    invoice_id: invoice.id,
    trade_id: invoice.trade_id,
    job_id: invoice.job_id,
    payment_id: p.paymentId ?? null,
    credit_note_number: `${row.prefix} CN ${String(row.seq).padStart(4, '0')}`,
    sequence: row.seq,
    amount_pence: p.amountPence,
    net_pence: split.net,
    vat_pence: split.vat,
    reason: p.reason.slice(0, 300),
    kind: p.kind,
  }).select('*').single()
  if (!cn) return null
  const { data: all } = await admin.from('credit_notes').select('amount_pence').eq('invoice_id', invoice.id)
  const credited = (all ?? []).reduce((s, c) => s + (c.amount_pence as number), 0)
  if (credited >= invoice.total_pence) await admin.from('invoices').update({ status: 'credited' }).eq('id', invoice.id)
  await onCreditNoteIssued(admin, cn as CreditNote)
  return cn as CreditNote
}
