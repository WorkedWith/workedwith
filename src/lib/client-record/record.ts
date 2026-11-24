import type { createAdminClient } from '@/lib/supabase/admin'
import { signedPhotoUrls } from '@/lib/photos'
import { LABEL_TEXT, type ReviewLabel } from '@/lib/reviews/windows'
import type { Payment, PaymentStage } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type ClientRecord = {
  name: string
  kind: 'person' | 'company'
  company: string | null
  memberSince: string
  summary: string
  figures: {
    jobsCompleted: number
    jobsFullyPaid: number
    stagesPaid: number
    stagesPaidOnTime: number
    avgDaysToPay: number | null
    paidAfterRequest: number
    unpaidJobs: number
    disputes: number
    lostChargebacks: number
  }
  rating: number
  reviewCount: number
  redFlagCount: number
  reviews: { id: string; rating: number | null; text: string | null; label: string | null; date: string; trade: string; photos: string[]; response: string | null }[]
}

/**
 * The client record, built only from WorkedWith jobs (PRD 14). Shows what happened, never another trade's
 * prices or addresses. Paid elsewhere payments count only once the client confirms them.
 */
export async function computeClientRecord(admin: AdminClient, clientId: string): Promise<ClientRecord | null> {
  const [{ data: u }, { data: cp }] = await Promise.all([
    admin.from('users').select('full_name, created_at').eq('id', clientId).maybeSingle(),
    admin.from('client_profiles').select('*').eq('user_id', clientId).maybeSingle(),
  ])
  if (!u || !cp) return null
  const { data: jobs } = await admin.from('jobs').select('id, status').eq('flow', 'quote').eq('client_user_id', clientId)
  const jobIds = (jobs ?? []).map(j => j.id as string)
  const [{ data: st }, { data: pays }] = await Promise.all([
    jobIds.length ? admin.from('payment_stages').select('*').in('job_id', jobIds) : Promise.resolve({ data: [] }),
    jobIds.length ? admin.from('payments').select('*').in('job_id', jobIds) : Promise.resolve({ data: [] }),
  ])
  const stages = (st ?? []) as PaymentStage[]
  const payments = (pays ?? []) as Payment[]
  const counts = (p: Payment) => !p.method.startsWith('paid_elsewhere') || !!p.client_confirmed_at
  const paidStages = stages.filter(s => s.status === 'paid' && payments.filter(p => p.stage_id === s.id).every(counts))
  // Stages paid only after a trade request are counted apart and not in "paid on time" (PRD 9)
  const approvedPaid = paidStages.filter(s => !s.requested_by_trade_at || s.approved_at)
  const onTime = approvedPaid.filter(s => s.paid_at && s.due_at && new Date(s.paid_at) <= new Date(s.due_at))
  const days = approvedPaid
    .map(s => (s.paid_at && (s.approved_at ?? s.due_at) ? (new Date(s.paid_at).getTime() - new Date((s.approved_at ?? s.due_at) as string).getTime()) / 86_400_000 : null))
    .filter((d): d is number => d !== null)
  const completedStatuses = ['completed', 'paid']
  const jobsCompleted = (jobs ?? []).filter(j => completedStatuses.includes(j.status as string)).length
  const jobsFullyPaid = (jobs ?? []).filter(j => j.status === 'paid').length
  const overdueJobs = new Set(stages.filter(s => s.status === 'overdue' || (s.due_at && new Date(s.due_at).getTime() < Date.now() - 30 * 86_400_000 && s.status !== 'paid' && s.status !== 'cancelled' && s.amount_paid_pence < s.amount_pence && !s.is_deposit)).map(s => s.job_id))

  const { data: rv } = await admin.from('reviews').select('id, overall_rating, written_review, label, submitted_at, published_at, reviewer_id, response_text').eq('reviewee_id', clientId).eq('reviewee_type', 'client').eq('is_visible', true).order('submitted_at', { ascending: false }).limit(20)
  const reviewerIds = Array.from(new Set((rv ?? []).map(r => r.reviewer_id as string)))
  const { data: tps } = reviewerIds.length ? await admin.from('trade_profiles').select('user_id, trade_types').in('user_id', reviewerIds) : { data: [] }
  const tradeOf = new Map((tps ?? []).map(t => [t.user_id as string, ((t.trade_types as string[] | null) ?? [])[0] ?? 'Trade']))
  const { data: ph } = (rv ?? []).length ? await admin.from('review_photos').select('review_id, path').in('review_id', (rv ?? []).map(r => r.id as string)).eq('moderation_status', 'approved') : { data: [] }
  const urls = new Map((await signedPhotoUrls(admin, (ph ?? []).map(p => p.path as string))).map(p => [p.path, p.url]))

  const { count: disputes } = await admin.from('payments').select('id', { count: 'exact', head: true }).in('job_id', jobIds.length ? jobIds : ['00000000-0000-0000-0000-000000000000']).not('client_disputed_at', 'is', null)
  const lostChargebacks = await countLostChargebacks(admin, jobIds)

  const unpaid = overdueJobs.size
  const summary = jobsCompleted === 0 && approvedPaid.length === 0
    ? 'No WorkedWith jobs paid yet'
    : unpaid > 0
      ? `${jobsCompleted} ${jobsCompleted === 1 ? 'job' : 'jobs'}, ${unpaid} with a payment over 30 days late`
      : onTime.length === approvedPaid.length
        ? `${jobsCompleted} ${jobsCompleted === 1 ? 'job' : 'jobs'}, all paid on time`
        : `${jobsCompleted} ${jobsCompleted === 1 ? 'job' : 'jobs'}, ${onTime.length} of ${approvedPaid.length} stages paid on time`

  return {
    name: u.full_name as string,
    kind: cp.client_type === 'business' ? 'company' : 'person',
    company: (cp.company_name as string | null) ?? null,
    memberSince: u.created_at as string,
    summary,
    figures: {
      jobsCompleted, jobsFullyPaid, stagesPaid: approvedPaid.length, stagesPaidOnTime: onTime.length,
      avgDaysToPay: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
      paidAfterRequest: paidStages.length - approvedPaid.length, unpaidJobs: unpaid, disputes: disputes ?? 0, lostChargebacks,
    },
    rating: Number(cp.average_rating ?? 0),
    reviewCount: (cp.total_reviews as number) ?? 0,
    redFlagCount: (cp.red_flag_count as number) ?? 0,
    reviews: (rv ?? []).map(r => ({
      id: r.id as string, rating: r.overall_rating as number | null, text: r.written_review as string | null,
      label: r.label ? LABEL_TEXT[r.label as ReviewLabel] : null, date: (r.published_at ?? r.submitted_at) as string,
      trade: tradeOf.get(r.reviewer_id as string) ?? 'Trade',
      photos: (ph ?? []).filter(p => p.review_id === r.id).map(p => urls.get(p.path as string)).filter((x): x is string => !!x),
      response: r.response_text as string | null,
    })),
  }
}

/** Phase 13 records chargebacks; until then there are none. */
async function countLostChargebacks(admin: AdminClient, jobIds: string[]): Promise<number> {
  void admin
  void jobIds
  return 0
}
