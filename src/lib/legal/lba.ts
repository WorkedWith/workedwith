import type { createAdminClient } from '@/lib/supabase/admin'
import { getPayeeDetails, type PayeeDetails } from '@/lib/getting-paid/bank-account'
import { fixedCompensationPence, referenceRatePercent, statutoryInterestPence } from './late-payment'
import type { Invoice } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type LbaLine = { invoiceNumber: string; description: string; issuedAt: string; dueAt: string; balancePence: number; interestPence: number; compensationPence: number; requestedByTrade: boolean }

export type LbaData = {
  version: 'person' | 'company'
  responseDays: number
  letterDate: string
  respondBy: string
  trade: { name: string; address: string | null; email: string | null; phone: string | null }
  client: { name: string; company: string | null; address: string | null; email: string | null }
  jobTitle: string
  lines: LbaLine[]
  principalPence: number
  interestPence: number
  compensationPence: number
  totalPence: number
  referenceRate: number
  includeInterest: boolean
  payee: PayeeDetails | null
}

/** Non deposit stages at least 21 days overdue can go to a letter (PRD 10). Deposits never do. */
export async function overdueInvoicesForLetter(admin: AdminClient, jobId: string, minDays = 21): Promise<Invoice[]> {
  const { data } = await admin.from('invoices').select('*').eq('job_id', jobId).in('status', ['issued', 'part_paid']).neq('approval_basis', 'deposit')
  const cutoff = Date.now() - minDays * 86_400_000
  return ((data ?? []) as Invoice[]).filter(i => new Date(i.due_at).getTime() <= cutoff && i.total_pence > i.amount_paid_pence)
}

export async function buildLbaData(admin: AdminClient, jobId: string, opts: { includeInterest: boolean }): Promise<LbaData | null> {
  const { data: job } = await admin.from('jobs').select('id, title, job_address, trade_user_id, client_user_id, client_type_at_acceptance, current_quote_id').eq('id', jobId).maybeSingle()
  if (!job?.trade_user_id || !job.client_user_id) return null
  const invoices = await overdueInvoicesForLetter(admin, jobId)
  if (invoices.length === 0) return null
  const version: 'person' | 'company' = job.client_type_at_acceptance === 'company' ? 'company' : 'person'
  const includeInterest = version === 'company' && opts.includeInterest
  const now = new Date()
  const responseDays = version === 'person' ? 30 : 14
  const [{ data: tp }, { data: tu }, { data: cu }, { data: cp }, { data: q }] = await Promise.all([
    admin.from('trade_profiles').select('company_name, trading_address, business_email, business_phone').eq('user_id', job.trade_user_id).maybeSingle(),
    admin.from('users').select('full_name, email, phone').eq('id', job.trade_user_id).maybeSingle(),
    admin.from('users').select('full_name, email').eq('id', job.client_user_id).maybeSingle(),
    admin.from('client_profiles').select('company_name').eq('user_id', job.client_user_id).maybeSingle(),
    admin.from('quotes').select('client_name').eq('id', job.current_quote_id as string).maybeSingle(),
  ])
  const lines: LbaLine[] = invoices.map(i => {
    const balance = i.total_pence - i.amount_paid_pence
    return {
      invoiceNumber: i.invoice_number, description: i.description, issuedAt: i.issued_at, dueAt: i.due_at, balancePence: balance,
      interestPence: includeInterest ? statutoryInterestPence(balance, new Date(i.due_at), now) : 0,
      compensationPence: includeInterest ? fixedCompensationPence(i.total_pence) : 0,
      requestedByTrade: i.approval_basis === 'requested_by_trade',
    }
  })
  const principal = lines.reduce((s, l) => s + l.balancePence, 0)
  const interest = lines.reduce((s, l) => s + l.interestPence, 0)
  const comp = lines.reduce((s, l) => s + l.compensationPence, 0)
  return {
    version, responseDays,
    letterDate: now.toISOString(),
    respondBy: new Date(now.getTime() + responseDays * 86_400_000).toISOString(),
    trade: { name: (tp?.company_name as string | null) ?? (tu?.full_name as string) ?? 'Trade', address: (tp?.trading_address as string | null) ?? null, email: (tp?.business_email as string | null) ?? (tu?.email as string | null) ?? null, phone: (tp?.business_phone as string | null) ?? null },
    client: { name: (q?.client_name as string | undefined) ?? (cu?.full_name as string) ?? 'Client', company: version === 'company' ? ((cp?.company_name as string | null) ?? null) : null, address: (job.job_address as string | null) ?? null, email: (cu?.email as string | null) ?? null },
    jobTitle: (job.title as string | null) ?? 'Job',
    lines, principalPence: principal, interestPence: interest, compensationPence: comp, totalPence: principal + interest + comp,
    referenceRate: referenceRatePercent(), includeInterest,
    payee: await getPayeeDetails(admin, job.trade_user_id),
  }
}
