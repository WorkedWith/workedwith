import type { createAdminClient } from '@/lib/supabase/admin'
import { getPayeeDetails, type PayeeDetails } from '@/lib/getting-paid/bank-account'
import { METHOD_LABEL } from '@/lib/payments/labels'
import { APP_URL } from '@/lib/app-url'
import { approvedVariationsForStage } from '@/lib/variations/for-stage'
import type { CreditNote, Invoice, Payment } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type InvoiceDoc = {
  invoice: Invoice
  trade: { name: string; address: string | null; vatNumber: string | null; email: string | null }
  client: { name: string; company: string | null; jobAddress: string | null }
  jobTitle: string
  lines: { description: string; amountPence: number }[]
  payments: Payment[]
  credits: CreditNote[]
  payee: PayeeDetails | null
  requestedByTrade: boolean
  url: string
}

/** Everything an invoice shows (PRD 11). Both parties can see it; callers check who is asking. */
export async function loadInvoiceDoc(admin: AdminClient, invoiceId: string): Promise<InvoiceDoc | null> {
  const { data: inv } = await admin.from('invoices').select('*').eq('id', invoiceId).maybeSingle()
  if (!inv) return null
  const invoice = inv as Invoice
  const [{ data: tp }, { data: job }, { data: pays }, { data: credits }] = await Promise.all([
    admin.from('trade_profiles').select('company_name, trading_address, vat_number, business_email').eq('user_id', invoice.trade_id).maybeSingle(),
    admin.from('jobs').select('title, job_address, client_user_id, current_quote_id').eq('id', invoice.job_id).maybeSingle(),
    admin.from('payments').select('*').eq('invoice_id', invoice.id).order('paid_at'),
    admin.from('credit_notes').select('*').eq('invoice_id', invoice.id).order('issued_at'),
  ])
  const { data: q } = await admin.from('quotes').select('client_name, client_company_name').eq('id', job?.current_quote_id as string).maybeSingle()
  const { data: cp } = await admin.from('client_profiles').select('company_name, client_type').eq('user_id', job?.client_user_id as string).maybeSingle()
  const { data: stage } = invoice.stage_id ? await admin.from('payment_stages').select('name, amount_pence, is_deposit').eq('id', invoice.stage_id).maybeSingle() : { data: null }
  const vars = invoice.stage_id ? await approvedVariationsForStage(admin, invoice.stage_id) : []
  const varTotal = vars.reduce((s, v) => s + v.amountPence, 0)

  const lines = [{ description: stage ? (stage.is_deposit ? 'Deposit' : stage.name) : invoice.description, amountPence: invoice.total_pence - varTotal }]
  for (const v of vars) lines.push({ description: `Approved variation: ${v.description}`, amountPence: v.amountPence })

  return {
    invoice,
    trade: { name: (tp?.company_name as string | null) ?? 'Trade', address: (tp?.trading_address as string | null) ?? null, vatNumber: (tp?.vat_number as string | null) ?? null, email: (tp?.business_email as string | null) ?? null },
    client: {
      name: (q?.client_name as string | undefined) ?? 'Client',
      company: cp?.client_type === 'business' ? ((cp?.company_name as string | null) ?? (q?.client_company_name as string | null) ?? null) : null,
      jobAddress: (job?.job_address as string | null) ?? null,
    },
    jobTitle: (job?.title as string | null) ?? 'Job',
    lines,
    payments: (pays ?? []) as Payment[],
    credits: (credits ?? []) as CreditNote[],
    payee: await getPayeeDetails(admin, invoice.trade_id),
    requestedByTrade: invoice.approval_basis === 'requested_by_trade',
    url: `${APP_URL}/my/invoices/${invoice.id}`,
  }
}

export const paidLine = (p: Payment) => `${new Date(p.paid_at).toLocaleDateString('en-GB')} by ${METHOD_LABEL[p.method]}`
