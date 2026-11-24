import type { createAdminClient } from '@/lib/supabase/admin'
import { messageClient, messageTrade, getTradeSender } from '@/lib/messages/send'
import { createAccessLink } from '@/lib/clients/accounts'
import { reviewWindowEmail } from '@/lib/email/templates-v42'
import { notify } from '@/lib/notify'
import { refreshScores } from './scores'
import { logJobEvent } from '@/lib/jobs/events'

type AdminClient = ReturnType<typeof createAdminClient>

export type WindowReason = 'paid' | 'overdue_30_days' | 'cancelled_after_start'
export type ReviewLabel = 'paid_job' | 'unpaid' | 'ended_early'

const WINDOW_DAYS = 14
const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

export function labelFor(reason: WindowReason, jobStatus: string): ReviewLabel {
  if (jobStatus === 'paid') return 'paid_job'
  if (reason === 'cancelled_after_start') return 'ended_early'
  return reason === 'paid' ? 'paid_job' : 'unpaid'
}

export const LABEL_TEXT: Record<ReviewLabel, string> = { paid_job: 'Paid job', unpaid: 'Unpaid', ended_early: 'Ended early' }

/**
 * Open the 14 day review window for both sides at once (PRD 13): on full payment, 30 days overdue, or
 * cancellation after work started. Never for declined, withdrawn or expired quotes, or jobs cancelled
 * before they started. If a window is already open, an unpaid job that is later paid just updates labels.
 */
export async function openReviewWindow(admin: AdminClient, jobId: string, reason: WindowReason): Promise<void> {
  const { data: job } = await admin.from('jobs').select('id, title, status, flow, started_at, trade_user_id, client_user_id').eq('id', jobId).maybeSingle()
  if (!job || job.flow !== 'quote' || !job.trade_user_id || !job.client_user_id) return
  if (reason === 'cancelled_after_start' && !job.started_at) return

  const { data: existing } = await admin.from('review_windows').select('id').eq('job_id', jobId).maybeSingle()
  if (existing) {
    if (reason === 'paid') await refreshLabels(admin, jobId)
    return
  }
  const now = new Date()
  const closes = new Date(now.getTime() + WINDOW_DAYS * 86_400_000)
  const { error } = await admin.from('review_windows').insert({
    job_id: jobId, flow: 'quote', opened_reason: reason, window_opened_at: now.toISOString(),
    window_closes_at: closes.toISOString(), blind_window_closes_at: closes.toISOString(),
  })
  if (error) return
  await logJobEvent(admin, jobId, 'review_window', `Review window opened (${reason === 'paid' ? 'job paid' : reason === 'overdue_30_days' ? 'payment 30 days overdue' : 'cancelled after work started'}). Closes ${fmt(closes)}.`, null)

  const sender = await getTradeSender(admin, job.trade_user_id)
  const { data: cu } = await admin.from('users').select('full_name').eq('id', job.client_user_id).maybeSingle()
  const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'review', targetPath: `/my/jobs/${jobId}#review`, createdBy: job.trade_user_id })
  await messageClient(admin, { tradeUserId: job.trade_user_id, clientUserId: job.client_user_id, email: reviewWindowEmail({ other: sender.businessName, title: job.title ?? 'your job', link, kind: 'open', closesOn: fmt(closes) }) })
  await notify(admin, job.client_user_id, { type: 'review', title: `You can now review ${sender.businessName}`, link: `/my/jobs/${jobId}#review` })
  await messageTrade(admin, { tradeUserId: job.trade_user_id, type: 'review', title: `You can now review ${(cu?.full_name as string | undefined) ?? 'your client'}`, body: job.title ?? '', link: `/jobs/${jobId}#review`, email: reviewWindowEmail({ other: (cu?.full_name as string | undefined) ?? 'your client', title: job.title ?? 'the job', link: `/jobs/${jobId}#review`, kind: 'open', closesOn: fmt(closes) }) })
}

/** "Unpaid" becomes "Paid job" if the job is later paid (PRD 13). */
export async function refreshLabels(admin: AdminClient, jobId: string): Promise<void> {
  const { data: job } = await admin.from('jobs').select('status').eq('id', jobId).maybeSingle()
  if (job?.status === 'paid') await admin.from('reviews').update({ label: 'paid_job' }).eq('job_id', jobId).eq('label', 'unpaid')
}

/** Publish everything submitted on a job, together, and close the window. */
export async function publishWindow(admin: AdminClient, jobId: string): Promise<void> {
  const now = new Date().toISOString()
  const { data: reviews } = await admin.from('reviews').select('id, reviewee_id, reviewee_type, reviewer_id').eq('job_id', jobId)
  await admin.from('reviews').update({ is_visible: true, published_at: now }).eq('job_id', jobId).eq('is_visible', false)
  await admin.from('review_windows').update({ closed_at: now, both_submitted_at: (reviews ?? []).length >= 2 ? now : null }).eq('job_id', jobId)
  for (const r of reviews ?? []) {
    await refreshScores(admin, r.reviewee_id as string, r.reviewee_type as 'trade' | 'client')
    await notify(admin, r.reviewee_id as string, { type: 'review', title: 'A review about you is published', link: r.reviewee_type === 'trade' ? `/jobs/${jobId}#review` : `/my/jobs/${jobId}#review` })
    await notify(admin, r.reviewer_id as string, { type: 'review', title: 'Your review is published', link: r.reviewee_type === 'trade' ? `/my/jobs/${jobId}#review` : `/jobs/${jobId}#review` })
  }
  if ((reviews ?? []).length) await logJobEvent(admin, jobId, 'reviews_published', `${(reviews ?? []).length === 2 ? 'Both reviews' : 'One review'} published`, null)
}

/** Daily: close windows at 14 days (a single review publishes alone), and remind at day 3 and 10. */
export async function runReviewWindows(admin: AdminClient): Promise<{ closed: number; reminders: number }> {
  const out = { closed: 0, reminders: 0 }
  const { data } = await admin.from('review_windows').select('*').eq('flow', 'quote').is('closed_at', null).limit(2000)
  for (const w of data ?? []) {
    const jobId = w.job_id as string
    if (w.window_closes_at && new Date(w.window_closes_at as string) <= new Date()) {
      await publishWindow(admin, jobId)
      out.closed++
      continue
    }
    const day = Math.floor((Date.now() - new Date(w.window_opened_at as string).getTime()) / 86_400_000)
    const due = day >= 10 && !w.reminder_10_sent_at ? 10 : day >= 3 && !w.reminder_3_sent_at ? 3 : 0
    if (!due) continue
    await admin.from('review_windows').update(due === 10 ? { reminder_10_sent_at: new Date().toISOString() } : { reminder_3_sent_at: new Date().toISOString() }).eq('id', w.id as string)
    const { data: job } = await admin.from('jobs').select('title, trade_user_id, client_user_id').eq('id', jobId).maybeSingle()
    if (!job?.trade_user_id || !job.client_user_id) continue
    const closes = fmt(new Date(w.window_closes_at as string))
    const sender = await getTradeSender(admin, job.trade_user_id)
    const { data: cu } = await admin.from('users').select('full_name').eq('id', job.client_user_id).maybeSingle()
    if (!w.client_review_submitted) {
      const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'review', targetPath: `/my/jobs/${jobId}#review`, createdBy: job.trade_user_id })
      await messageClient(admin, { tradeUserId: job.trade_user_id, clientUserId: job.client_user_id, email: reviewWindowEmail({ other: sender.businessName, title: job.title ?? 'your job', link, kind: 'reminder', closesOn: closes }) })
    }
    if (!w.trade_review_submitted) {
      await messageTrade(admin, { tradeUserId: job.trade_user_id, type: 'review', title: 'Reminder: write your review', body: job.title ?? '', link: `/jobs/${jobId}#review`, email: reviewWindowEmail({ other: (cu?.full_name as string | undefined) ?? 'your client', title: job.title ?? 'the job', link: `/jobs/${jobId}#review`, kind: 'reminder', closesOn: closes }) })
    }
    out.reminders++
  }
  return out
}
