import type { createAdminClient } from '@/lib/supabase/admin'
import { formatPence } from '@/lib/money'
import type { JobEvent, Quote } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * The chargeback evidence, built automatically from the job record (PRD 9): accepted quote, terms and
 * acceptance record, variations, approvals or requests, photos, invoices and reminders sent.
 */
export async function buildChargebackSummary(admin: AdminClient, jobId: string, tradeNote: string): Promise<{ summary: string; customerName: string; email: string | null; serviceDate: string | null }> {
  const { data: job } = await admin.from('jobs').select('title, job_address, client_user_id, started_at, current_quote_id').eq('id', jobId).maybeSingle()
  const { data: q } = await admin.from('quotes').select('*').eq('id', job?.current_quote_id as string).maybeSingle()
  const quote = q as Quote | null
  const { data: u } = await admin.from('users').select('full_name, email').eq('id', job?.client_user_id as string).maybeSingle()
  const { data: events } = await admin.from('job_events').select('*').eq('job_id', jobId).order('created_at')
  const { count: photos } = await admin.from('stage_evidence').select('id', { count: 'exact', head: true }).in('stage_id', ((await admin.from('payment_stages').select('id').eq('job_id', jobId)).data ?? []).map(s => s.id as string))
  const lines = [
    `Job: ${job?.title ?? ''}${job?.job_address ? `, ${job.job_address}` : ''}.`,
    quote ? `The client accepted quote version ${quote.version} for ${formatPence(quote.total_pence)} on ${quote.accepted_at ? new Date(quote.accepted_at).toLocaleString('en-GB') : ''}, from their own signed in account after confirming the terms (version ${quote.terms_snapshot?.standardTermsVersion ?? ''}).` : '',
    `Stage photos on record: ${photos ?? 0}.`,
    'Timeline from the WorkedWith record:',
    ...((events ?? []) as JobEvent[]).map(e => `${new Date(e.created_at).toLocaleString('en-GB')}: ${e.summary}`),
    tradeNote.trim() ? `Note from the trade: ${tradeNote.trim()}` : '',
  ].filter(Boolean)
  return { summary: lines.join('\n'), customerName: (u?.full_name as string | undefined) ?? '', email: (u?.email as string | null) ?? null, serviceDate: job?.started_at ? (job.started_at as string).slice(0, 10) : null }
}
