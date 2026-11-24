import type { createAdminClient } from '@/lib/supabase/admin'
import { canRequestPaymentAnyway } from '@/lib/jobs/cancel'
import type { PaymentStage } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type NeedItem = { key: string; text: string; href: string; tone: 'amber' | 'red' | 'blue' }
export type HomeFigures = { owed: number; overdue: number; awaitingApproval: number; paidThisMonth: number }
export type Checklist = { profile: boolean; bank: boolean; openBanking: boolean; accounting: boolean }

const DUE = ['approved', 'requested_by_trade', 'part_paid', 'overdue']

/** Everything on the trade's home (PRD 18): figures, "needs you" and the set up checklist. */
export async function loadTradeHome(admin: AdminClient, userId: string): Promise<{ figures: HomeFigures; needs: NeedItem[]; checklist: Checklist }> {
  const { data: jobs } = await admin.from('jobs').select('id, title, status, agreed_start_date, booked_at, deposit_outcome').eq('flow', 'quote').eq('trade_user_id', userId)
  const jobIds = (jobs ?? []).map(j => j.id as string)
  const title = new Map((jobs ?? []).map(j => [j.id as string, (j.title as string | null) ?? 'Job']))
  const { data: st } = jobIds.length ? await admin.from('payment_stages').select('*').in('job_id', jobIds) : { data: [] }
  const stages = (st ?? []) as PaymentStage[]
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const { data: pays } = jobIds.length ? await admin.from('payments').select('amount_pence, refunded_pence, status').in('job_id', jobIds).gte('paid_at', monthStart) : { data: [] }

  const due = stages.filter(s => DUE.includes(s.status))
  const figures: HomeFigures = {
    owed: due.reduce((t, s) => t + s.amount_pence - s.amount_paid_pence, 0),
    overdue: due.filter(s => s.due_at && new Date(s.due_at) < now).reduce((t, s) => t + s.amount_pence - s.amount_paid_pence, 0),
    awaitingApproval: stages.filter(s => s.status === 'awaiting_approval').reduce((t, s) => t + s.amount_pence, 0),
    paidThisMonth: (pays ?? []).filter(p => p.status !== 'failed').reduce((t, p) => t + (p.amount_pence as number) - ((p.refunded_pence as number) ?? 0), 0),
  }

  const needs: NeedItem[] = []
  const { count: suggested } = await admin.from('bank_matches').select('id', { count: 'exact', head: true }).eq('trade_id', userId).eq('match_status', 'suggested')
  if (suggested) needs.push({ key: 'matches', text: `${suggested} ${suggested === 1 ? 'payment' : 'payments'} to confirm`, href: '/dashboard', tone: 'amber' })
  for (const j of jobs ?? []) {
    if (j.status === 'booked' && !j.agreed_start_date && j.booked_at && Date.now() - new Date(j.booked_at as string).getTime() > 14 * 86_400_000) needs.push({ key: `start-${j.id}`, text: `${j.title ?? 'A job'} needs a start date`, href: `/jobs/${j.id}`, tone: 'blue' })
    if (j.status === 'cancelled' && j.deposit_outcome === 'refund_due') needs.push({ key: `refund-${j.id}`, text: `Deposit refund due: ${j.title ?? 'a job'}`, href: `/jobs/${j.id}`, tone: 'red' })
  }
  if (stages.length) {
    const { data: issues } = await admin.from('stage_issues').select('stage_id, created_at').eq('status', 'open').in('stage_id', stages.map(s => s.id))
    const openIssue = new Map((issues ?? []).map(i => [i.stage_id as string, i.created_at as string]))
    for (const s of stages) {
      if (canRequestPaymentAnyway(s, openIssue.get(s.id) ?? null)) needs.push({ key: `req-${s.id}`, text: `You can request payment: ${s.name} on ${title.get(s.job_id)}`, href: `/jobs/${s.job_id}`, tone: 'amber' })
      else if (s.status === 'issue_raised') needs.push({ key: `iss-${s.id}`, text: `Issue raised: ${s.name} on ${title.get(s.job_id)}`, href: `/jobs/${s.job_id}`, tone: 'red' })
    }
  }
  const { data: bank } = await admin.from('trade_bank_accounts').select('connection_status').eq('trade_id', userId).maybeSingle()
  if (bank?.connection_status === 'needs_reconfirm' || bank?.connection_status === 'lapsed') needs.push({ key: 'bank', text: bank.connection_status === 'lapsed' ? 'Your bank connection has lapsed' : 'Reconfirm your bank connection', href: '/profile/getting-paid', tone: 'amber' })
  const { data: acc } = await admin.from('accounting_connections').select('status').eq('trade_id', userId).maybeSingle()
  const { count: syncFailed } = await admin.from('accounting_sync_items').select('id', { count: 'exact', head: true }).eq('trade_id', userId).eq('status', 'failed')
  if (syncFailed) needs.push({ key: 'sync', text: `${syncFailed} accounting ${syncFailed === 1 ? 'record' : 'records'} failed to sync`, href: '/profile/getting-paid', tone: 'red' })
  if (acc?.status === 'expired') needs.push({ key: 'acc', text: 'Reconnect your accounting software', href: '/profile/getting-paid', tone: 'amber' })
  const { data: cbs } = await admin.from('chargebacks').select('job_id').eq('trade_id', userId).is('evidence_submitted_at', null).is('closed_at', null)
  for (const c of cbs ?? []) needs.push({ key: `cb-${c.job_id}`, text: `Card payment disputed on ${title.get(c.job_id as string) ?? 'a job'}`, href: `/jobs/${c.job_id}`, tone: 'red' })
  if (jobIds.length) {
    const { data: windows } = await admin.from('review_windows').select('job_id').in('job_id', jobIds).eq('flow', 'quote').is('closed_at', null).eq('trade_review_submitted', false)
    for (const w of windows ?? []) needs.push({ key: `rv-${w.job_id}`, text: `Write your review: ${title.get(w.job_id as string)}`, href: `/jobs/${w.job_id}#review`, tone: 'blue' })
  }

  const { data: tp } = await admin.from('trade_profiles').select('company_name, business_email, operating_areas').eq('user_id', userId).maybeSingle()
  const checklist: Checklist = {
    profile: !!tp?.company_name && !!tp?.business_email && ((tp?.operating_areas as string[] | null) ?? []).length > 0,
    bank: !!bank,
    openBanking: ['connected', 'needs_reconfirm', 'unsupported'].includes((bank?.connection_status as string | undefined) ?? ''),
    accounting: acc?.status === 'connected',
  }
  return { figures, needs, checklist }
}
