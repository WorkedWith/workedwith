import type { createAdminClient } from '@/lib/supabase/admin'
import { toCsv, pounds, isoDate } from './csv'
import { METHOD_LABEL } from '@/lib/payments/labels'
import type { CreditNote, Invoice, Payment } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type Range = { from: string; to: string }

async function clientNames(admin: AdminClient, jobIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (jobIds.length === 0) return out
  const { data: jobs } = await admin.from('jobs').select('id, current_quote_id, client_user_id').in('id', jobIds)
  const qIds = (jobs ?? []).map(j => j.current_quote_id).filter((x): x is string => !!x)
  const { data: qs } = qIds.length ? await admin.from('quotes').select('id, client_name, client_company_name').in('id', qIds) : { data: [] }
  const qMap = new Map((qs ?? []).map(q => [q.id as string, q]))
  for (const j of jobs ?? []) {
    const q = qMap.get(j.current_quote_id as string)
    out.set(j.id as string, q ? ((q.client_company_name as string | null) ?? (q.client_name as string)) : '')
  }
  return out
}

const endOf = (d: string) => `${d}T23:59:59.999Z`

/** Exports for the accountant (PRD 11). Always available, even after the trial or plan ends. */
export async function invoicesCsv(admin: AdminClient, tradeId: string, r: Range): Promise<string> {
  const { data } = await admin.from('invoices').select('*').eq('trade_id', tradeId).gte('issued_at', r.from).lte('issued_at', endOf(r.to)).order('sequence')
  const invs = (data ?? []) as Invoice[]
  const names = await clientNames(admin, Array.from(new Set(invs.map(i => i.job_id))))
  return toCsv(['Invoice number', 'Date', 'Due', 'Client', 'Description', 'Net', 'VAT', 'Total', 'Paid', 'Status', 'Basis'],
    invs.map(i => [i.invoice_number, isoDate(i.issued_at), isoDate(i.due_at), names.get(i.job_id) ?? '', i.description, pounds(i.net_pence), pounds(i.vat_pence), pounds(i.total_pence), pounds(i.amount_paid_pence), i.status,
      i.approval_basis === 'requested_by_trade' ? 'Payment requested by the trade, not approved by the client' : i.approval_basis === 'deposit' ? 'Deposit' : 'Approved by the client']))
}

export async function paymentsCsv(admin: AdminClient, tradeId: string, r: Range): Promise<string> {
  const { data: invs } = await admin.from('invoices').select('id, invoice_number, job_id').eq('trade_id', tradeId)
  const invMap = new Map((invs ?? []).map(i => [i.id as string, i]))
  const jobIds = Array.from(new Set((invs ?? []).map(i => i.job_id as string)))
  if (jobIds.length === 0) return toCsv(['Date', 'Invoice', 'Client', 'Amount', 'Method', 'Stripe card fee', 'Refunded', 'Client confirmed'], [])
  const { data } = await admin.from('payments').select('*').in('job_id', jobIds).gte('paid_at', r.from).lte('paid_at', endOf(r.to)).order('paid_at')
  const pays = (data ?? []) as Payment[]
  const names = await clientNames(admin, jobIds)
  return toCsv(['Date', 'Invoice', 'Client', 'Amount', 'Method', 'Stripe card fee', 'Refunded', 'Client confirmed'],
    pays.map(p => [isoDate(p.paid_at), p.invoice_id ? (invMap.get(p.invoice_id)?.invoice_number as string) ?? '' : '', names.get(p.job_id) ?? '', pounds(p.amount_pence), METHOD_LABEL[p.method], p.stripe_fee_pence ? pounds(p.stripe_fee_pence) : '', p.refunded_pence ? pounds(p.refunded_pence) : '', p.method.startsWith('paid_elsewhere') ? (p.client_confirmed_at ? 'Yes' : 'No') : '']))
}

export async function creditNotesCsv(admin: AdminClient, tradeId: string, r: Range): Promise<string> {
  const { data } = await admin.from('credit_notes').select('*').eq('trade_id', tradeId).gte('issued_at', r.from).lte('issued_at', endOf(r.to)).order('sequence')
  const cns = (data ?? []) as CreditNote[]
  const { data: invs } = await admin.from('invoices').select('id, invoice_number').in('id', cns.map(c => c.invoice_id))
  const invMap = new Map((invs ?? []).map(i => [i.id as string, i.invoice_number as string]))
  const names = await clientNames(admin, Array.from(new Set(cns.map(c => c.job_id))))
  return toCsv(['Credit note', 'Date', 'Invoice', 'Client', 'Reason', 'Net', 'VAT', 'Total'],
    cns.map(c => [c.credit_note_number, isoDate(c.issued_at), invMap.get(c.invoice_id) ?? '', names.get(c.job_id) ?? '', c.reason, pounds(c.net_pence), pounds(c.vat_pence), pounds(c.amount_pence)]))
}
