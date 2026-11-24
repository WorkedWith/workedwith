import type { createAdminClient } from '@/lib/supabase/admin'
import { splitGross } from '@/lib/quotes/calc'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient } from '@/lib/messages/send'
import { getPayeeDetails } from '@/lib/getting-paid/bank-account'
import { invoiceIssuedEmail } from '@/lib/email/templates-v42'
import { smsInvoiceIssued } from '@/lib/sms/copy-v42'
import { onInvoiceIssued } from '@/lib/invoices/hooks'
import { encryptSecret } from '@/lib/crypto/secret-box'
import type { ApprovalBasis, Invoice, PaymentStage, Quote } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export function formatInvoiceNumber(prefix: string, seq: number): string {
  return `${prefix} ${String(seq).padStart(4, '0')}`
}

/** "BLC 0014", "blc0014", "BLC-14" all compare equal. */
export function normaliseReference(ref: string): string {
  return ref.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/([A-Z]+)0*(\d+)/g, '$1$2')
}

export function basisOf(stage: Pick<PaymentStage, 'is_deposit' | 'approved_at' | 'requested_by_trade_at'>): ApprovalBasis {
  if (stage.is_deposit) return 'deposit'
  if (stage.approved_at) return 'client_approved'
  return 'requested_by_trade'
}

/**
 * Issue the invoice for a stage that has just become due (PRD 11). Never twice for one stage. The number is
 * allocated in one database transaction so it never skips or repeats, and it is the payment reference.
 */
export async function issueInvoiceForStage(admin: AdminClient, stageId: string): Promise<Invoice | null> {
  const { data: existing } = await admin.from('invoices').select('*').eq('stage_id', stageId).neq('status', 'credited').maybeSingle()
  if (existing) return existing as Invoice
  const { data: stage } = await admin.from('payment_stages').select('*').eq('id', stageId).maybeSingle()
  if (!stage) return null
  const st = stage as PaymentStage
  const { data: job } = await admin.from('jobs').select('id, title, trade_user_id, client_user_id, current_quote_id').eq('id', st.job_id).maybeSingle()
  if (!job?.trade_user_id) return null
  const { data: quote } = await admin.from('quotes').select('*').eq('id', (st.quote_id ?? job.current_quote_id) as string).maybeSingle()
  const q = quote as Quote | null

  const { data: alloc, error } = await admin.rpc('allocate_invoice_number', { p_trade: job.trade_user_id })
  const row = alloc?.[0]
  if (error || !row) {
    console.error('Invoice number allocation failed:', error)
    return null
  }
  const amount = st.amount_pence
  const split = q ? splitGross(amount, q.net_pence, q.vat_pence) : { net: amount, vat: 0 }
  const due = st.is_deposit ? (q?.deposit_due_by ?? new Date().toISOString()) : (st.due_at ?? new Date().toISOString())
  const { data: inv, error: insErr } = await admin.from('invoices').insert({
    trade_id: job.trade_user_id,
    job_id: job.id,
    stage_id: st.id,
    invoice_number: formatInvoiceNumber(row.prefix, row.seq),
    sequence: row.seq,
    due_at: due,
    net_pence: split.net,
    vat_pence: split.vat,
    total_pence: amount,
    amount_paid_pence: st.amount_paid_pence,
    status: st.amount_paid_pence >= amount ? 'paid' : st.amount_paid_pence > 0 ? 'part_paid' : 'issued',
    approval_basis: basisOf(st),
    description: st.is_deposit ? `${job.title ?? 'Job'}: deposit` : `${job.title ?? 'Job'}: ${st.name}`,
    payee_snapshot_encrypted: await payeeSnapshot(admin, job.trade_user_id),
  }).select('*').single()
  if (insErr || !inv) {
    console.error('Invoice insert failed:', insErr)
    return null
  }
  const invoice = inv as Invoice

  // Tell the client, with the bank details and reference (PRD 10, 17). The deposit has its own message.
  if (!st.is_deposit && job.client_user_id) {
    const sender = await getTradeSender(admin, job.trade_user_id)
    const payee = await getPayeeDetails(admin, job.trade_user_id)
    const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'invoice', targetPath: `/my/invoices/${invoice.id}`, createdBy: job.trade_user_id })
    await messageClient(admin, {
      tradeUserId: job.trade_user_id,
      clientUserId: job.client_user_id,
      email: invoiceIssuedEmail({ business: sender.businessName, invoiceNumber: invoice.invoice_number, description: invoice.description, totalPence: invoice.total_pence, dueAt: invoice.due_at, link, payee, requestedByTrade: invoice.approval_basis === 'requested_by_trade' }),
      sms: smsInvoiceIssued(sender.businessName, invoice.invoice_number, link),
    })
  }
  await onInvoiceIssued(admin, invoice)
  return invoice
}

/** The bank details on the invoice are frozen at issue (encrypted), so they survive the trade closing their account. */
async function payeeSnapshot(admin: AdminClient, tradeId: string): Promise<string | null> {
  const p = await getPayeeDetails(admin, tradeId)
  return p ? encryptSecret(JSON.stringify(p)) : null
}
