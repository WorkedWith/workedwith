'use server'

import { revalidatePath } from 'next/cache'
import { getUserSession } from '@/lib/auth/require-trade'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient, messageTrade } from '@/lib/messages/send'
import { confirmPaymentClientEmail, jobCancelledEmail, stageEventClientEmail, stageEventTradeEmail } from '@/lib/email/templates-v42'
import { smsApprovalReminder, smsPaymentRequested, smsStageDone } from '@/lib/sms/copy-v42'
import { logJobEvent } from '@/lib/jobs/events'
import { onStageDue } from '@/lib/jobs/hooks'
import { canRequestPaymentAnyway, depositPosition } from '@/lib/jobs/cancel'
import { recordPayment, refreshCompletion } from '@/lib/payments/apply'
import { recordRefundCredit } from '@/lib/payments/refunds'
import { openReviewWindow } from '@/lib/reviews/windows'
import { parsePounds, formatPence } from '@/lib/money'
import { METHOD_LABEL } from '@/lib/payments/labels'
import type { Job } from '@/types/database'
import type { PaymentMethod, PaymentStage, Quote } from '@/types/v42'

type R = { ok: true } | { ok: false; error: string }

async function stageCtx(stageId: string) {
  const s = await getUserSession()
  if (!s) return null
  const { data: st } = await s.admin.from('payment_stages').select('*').eq('id', stageId).maybeSingle()
  if (!st) return null
  const { data: j } = await s.admin.from('jobs').select('*').eq('id', st.job_id).maybeSingle()
  const job = j as unknown as Job | null
  if (!job) return null
  const role = job.trade_user_id === s.userId ? 'trade' : job.client_user_id === s.userId ? 'client' : null
  if (!role) return null
  return { ...s, stage: st as PaymentStage, job, role: role as 'trade' | 'client' }
}

function revalidate(jobId: string) {
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/my/jobs/${jobId}`)
}

async function nameOf(admin: NonNullable<Awaited<ReturnType<typeof stageCtx>>>['admin'], userId: string | null): Promise<string> {
  if (!userId) return 'The client'
  const { data } = await admin.from('users').select('full_name').eq('id', userId).maybeSingle()
  return (data?.full_name as string | undefined) ?? 'The client'
}

async function tellClient(c: NonNullable<Awaited<ReturnType<typeof stageCtx>>>, event: 'done' | 'reminder' | 'requested' | 'issue_reply', day?: number) {
  if (!c.job.client_user_id || !c.job.trade_user_id) return
  const sender = await getTradeSender(c.admin, c.job.trade_user_id)
  const link = await createAccessLink(c.admin, { clientUserId: c.job.client_user_id, purpose: 'stage', targetPath: `/my/jobs/${c.job.id}`, createdBy: c.job.trade_user_id })
  const sms = event === 'done' ? smsStageDone(sender.businessName, c.stage.name, link) : event === 'reminder' ? smsApprovalReminder(sender.businessName, c.stage.name, link) : event === 'requested' ? smsPaymentRequested(sender.businessName, c.stage.name, link) : null
  await messageClient(c.admin, { tradeUserId: c.job.trade_user_id, clientUserId: c.job.client_user_id, email: stageEventClientEmail({ business: sender.businessName, title: c.job.title ?? 'your job', stage: c.stage.name, link, event, day }), sms })
}

async function tellTrade(c: NonNullable<Awaited<ReturnType<typeof stageCtx>>>, event: 'approved' | 'issue' | 'issue_reply' | 'client_says_paid', note?: string | null) {
  if (!c.job.trade_user_id) return
  const client = await nameOf(c.admin, c.job.client_user_id)
  const titles = { approved: `Approved: ${c.stage.name}`, issue: `Issue raised: ${c.stage.name}`, issue_reply: `${client} replied about ${c.stage.name}`, client_says_paid: `${client} says they have paid` }
  await messageTrade(c.admin, { tradeUserId: c.job.trade_user_id, type: 'stage', title: titles[event], body: note ?? c.job.title ?? '', link: `/jobs/${c.job.id}`, email: stageEventTradeEmail({ client, title: c.job.title ?? 'the job', stage: c.stage.name, jobId: c.job.id, event, note }) })
}

async function dueAt(c: NonNullable<Awaited<ReturnType<typeof stageCtx>>>): Promise<string> {
  const { data } = await c.admin.from('trade_profiles').select('payment_terms_days').eq('user_id', c.job.trade_user_id as string).maybeSingle()
  const days = (data?.payment_terms_days as number | null) ?? 7
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

// ── Trade ─────────────────────────────────────────────────────

/** Mark a stage done with at least one photo (PRD 9). The client gets a text and email to review it. */
export async function markStageDone(stageId: string, photoPaths: string[], note: string): Promise<R> {
  const c = await stageCtx(stageId)
  if (!c || c.role !== 'trade') return { ok: false, error: 'Stage not found.' }
  if (c.stage.is_deposit) return { ok: false, error: 'The deposit is due on acceptance and is not marked done.' }
  if (!['upcoming', 'issue_raised'].includes(c.stage.status)) return { ok: false, error: 'This stage can’t be marked done now.' }
  if (c.job.status !== 'in_progress') return { ok: false, error: 'Mark the job started first.' }
  if (photoPaths.length === 0) return { ok: false, error: 'Add at least one photo of the work.' }
  const now = new Date().toISOString()
  const resubmit = c.stage.status === 'issue_raised'
  await c.admin.from('stage_evidence').insert({ stage_id: stageId, photo_paths: photoPaths.slice(0, 10), note: note.trim().slice(0, 1000) || null, created_by: c.userId })
  await c.admin.from('payment_stages').update({
    status: 'awaiting_approval', marked_done_at: now, last_trade_response_at: now,
    approval_reminder_5_at: null, approval_reminder_10_at: null, approval_reminder_14_at: null, stalled_notified_at: null,
  }).eq('id', stageId)
  if (resubmit) await c.admin.from('stage_issues').update({ status: 'resubmitted' }).eq('stage_id', stageId).eq('status', 'open')
  await logJobEvent(c.admin, c.job.id, resubmit ? 'stage_resubmitted' : 'stage_done', `${c.stage.name} ${resubmit ? 'resubmitted' : 'marked done'} by the trade with ${photoPaths.length} photo${photoPaths.length === 1 ? '' : 's'}`, c.userId)
  await tellClient(c, 'done')
  revalidate(c.job.id)
  return { ok: true }
}

/** The trade can nudge the client at any time, at most once a day (PRD 9). */
export async function sendApprovalReminder(stageId: string): Promise<R> {
  const c = await stageCtx(stageId)
  if (!c || c.role !== 'trade') return { ok: false, error: 'Stage not found.' }
  if (c.stage.status !== 'awaiting_approval') return { ok: false, error: 'This stage is not waiting for approval.' }
  if (c.stage.last_manual_reminder_at && Date.now() - new Date(c.stage.last_manual_reminder_at).getTime() < 86_400_000) return { ok: false, error: 'You can send one reminder a day.' }
  await c.admin.from('payment_stages').update({ last_manual_reminder_at: new Date().toISOString() }).eq('id', stageId)
  await logJobEvent(c.admin, c.job.id, 'approval_reminder', `Trade reminded the client to approve ${c.stage.name}`, c.userId)
  await tellClient(c, 'reminder')
  return { ok: true }
}

/**
 * Request payment anyway (PRD 9): after 14 days awaiting approval, or 14 days of an open issue since the
 * trade last responded. Always labelled "Payment requested by the trade. Not approved by the client".
 */
export async function requestPaymentAnyway(stageId: string, note: string, confirmComplete: boolean): Promise<R> {
  const c = await stageCtx(stageId)
  if (!c || c.role !== 'trade') return { ok: false, error: 'Stage not found.' }
  if (!confirmComplete) return { ok: false, error: 'Confirm the work is complete.' }
  const text = note.trim().slice(0, 1000)
  if (text.length < 5) return { ok: false, error: 'Add a short note explaining why.' }
  const { data: issue } = await c.admin.from('stage_issues').select('created_at').eq('stage_id', stageId).eq('status', 'open').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!canRequestPaymentAnyway(c.stage, (issue?.created_at as string | null) ?? null)) return { ok: false, error: 'You can request payment 14 days after marking the stage done, or 14 days after you last responded to an issue.' }
  const now = new Date().toISOString()
  await c.admin.from('payment_stages').update({ status: 'requested_by_trade', requested_by_trade_at: now, request_note: text, due_at: await dueAt(c) }).eq('id', stageId)
  await c.admin.from('stage_issues').update({ status: 'closed_by_request' }).eq('stage_id', stageId).eq('status', 'open')
  await logJobEvent(c.admin, c.job.id, 'payment_requested', `Payment requested by the trade for ${c.stage.name}. Not approved by the client.`, c.userId, { note: text })
  await onStageDue(c.admin, stageId)
  await tellClient(c, 'requested')
  await refreshCompletion(c.admin, c.job.id)
  revalidate(c.job.id)
  return { ok: true }
}

/** A bank transfer the trade saw arrive (no bank connection, or not matched). */
export async function markPaymentReceived(stageId: string, amount: string, date: string): Promise<R> {
  return markPaid(stageId, amount, date, 'bank_transfer_marked_by_trade')
}

/** Cash, cheque or a different account. The client is asked to confirm (PRD 9 paid elsewhere). */
export async function markPaidElsewhere(stageId: string, amount: string, date: string, how: 'cash' | 'cheque' | 'other_account'): Promise<R> {
  return markPaid(stageId, amount, date, `paid_elsewhere_${how}` as PaymentMethod)
}

async function markPaid(stageId: string, amount: string, date: string, method: PaymentMethod): Promise<R> {
  const c = await stageCtx(stageId)
  if (!c || c.role !== 'trade') return { ok: false, error: 'Stage not found.' }
  if (!['approved', 'requested_by_trade', 'part_paid', 'overdue'].includes(c.stage.status)) return { ok: false, error: 'Only stages that are due can be marked paid.' }
  const pence = parsePounds(amount)
  if (!pence) return { ok: false, error: 'Enter the amount received.' }
  const balance = c.stage.amount_pence - c.stage.amount_paid_pence
  if (pence > balance) return { ok: false, error: `That is more than the ${formatPence(balance)} still due.` }
  const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`).toISOString() : new Date().toISOString()
  const r = await recordPayment(c.admin, { stageId, amountPence: pence, method, paidAt, recordedBy: c.userId })
  if (!r.ok) return r
  if (method.startsWith('paid_elsewhere') && c.job.client_user_id && c.job.trade_user_id) {
    const sender = await getTradeSender(c.admin, c.job.trade_user_id)
    const link = await createAccessLink(c.admin, { clientUserId: c.job.client_user_id, purpose: 'job', targetPath: `/my/jobs/${c.job.id}`, createdBy: c.job.trade_user_id })
    await messageClient(c.admin, { tradeUserId: c.job.trade_user_id, clientUserId: c.job.client_user_id, email: confirmPaymentClientEmail({ business: sender.businessName, amountPence: pence, method: METHOD_LABEL[method], link, kind: 'paid_elsewhere' }) })
  }
  revalidate(c.job.id)
  return { ok: true }
}

/** "£1,200 from S MILLER. Is this invoice BLC 0014?" Nothing is paid until the trade confirms. */
export async function decideSuggestedMatch(matchId: string, accept: boolean): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: m } = await s.admin.from('bank_matches').select('*').eq('id', matchId).maybeSingle()
  if (!m || m.trade_id !== s.userId || m.match_status !== 'suggested') return { ok: false, error: 'That payment is no longer waiting.' }
  const now = new Date().toISOString()
  if (!accept) {
    // Not ours: forget everything about it except that it was rejected
    await s.admin.from('bank_matches').update({ match_status: 'rejected_by_trade', decided_at: now, payer_name: null, reference: null }).eq('id', matchId)
    return { ok: true }
  }
  const { data: inv } = await s.admin.from('invoices').select('stage_id, total_pence, amount_paid_pence').eq('id', m.invoice_id as string).maybeSingle()
  if (!inv?.stage_id) return { ok: false, error: 'Invoice not found.' }
  await s.admin.from('bank_matches').update({ match_status: 'confirmed_by_trade', decided_at: now }).eq('id', matchId)
  const r = await recordPayment(s.admin, { stageId: inv.stage_id, amountPence: Math.min(m.amount_pence, inv.total_pence - inv.amount_paid_pence), method: 'bank_transfer_matched', paidAt: m.received_at, bankMatchId: matchId, recordedBy: s.userId })
  return r.ok ? { ok: true } : r
}

/** Bank refunds are sent by the trade from their own bank, then marked here. The client confirms receipt. */
export async function markRefunded(paymentId: string, amount: string): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: p } = await s.admin.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (!p) return { ok: false, error: 'Payment not found.' }
  const { data: job } = await s.admin.from('jobs').select('id, trade_user_id, client_user_id').eq('id', p.job_id).maybeSingle()
  if (!job || job.trade_user_id !== s.userId) return { ok: false, error: 'Payment not found.' }
  if (p.method === 'card') return { ok: false, error: 'Card payments are refunded through Stripe from the job page.' }
  const pence = parsePounds(amount)
  if (!pence || pence > p.amount_pence - p.refunded_pence) return { ok: false, error: 'Enter an amount up to what was paid.' }
  await s.admin.from('payments').update({ refunded_pence: p.refunded_pence + pence, refund_marked_at: new Date().toISOString(), status: p.refunded_pence + pence >= p.amount_pence ? 'refunded' : 'paid' }).eq('id', paymentId)
  await recordRefundCredit(s.admin, paymentId, pence)
  await logJobEvent(s.admin, p.job_id, 'refund', `Trade marked a refund of ${formatPence(pence)}`, s.userId)
  if (job.client_user_id) {
    const sender = await getTradeSender(s.admin, s.userId)
    const link = await createAccessLink(s.admin, { clientUserId: job.client_user_id, purpose: 'job', targetPath: `/my/jobs/${job.id}`, createdBy: s.userId })
    await messageClient(s.admin, { tradeUserId: s.userId, clientUserId: job.client_user_id, email: confirmPaymentClientEmail({ business: sender.businessName, amountPence: pence, method: 'bank transfer', link, kind: 'refund' }) })
  }
  revalidate(p.job_id)
  return { ok: true }
}

/**
 * Either side cancels a booked or active job, with a reason (PRD 9). Due amounts stay due, unstarted stages
 * are cancelled, the deposit position is worked out and shown, and a job that had started opens reviews.
 */
export async function cancelJob(jobId: string, reason: string): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: j } = await s.admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  const job = j as unknown as Job | null
  if (!job || (job.trade_user_id !== s.userId && job.client_user_id !== s.userId)) return { ok: false, error: 'Job not found.' }
  if (!['quoted', 'booked', 'in_progress', 'completed'].includes(job.status)) return { ok: false, error: 'This job can’t be cancelled now.' }
  const { data: q } = await s.admin.from('quotes').select('*').eq('id', job.current_quote_id as string).maybeSingle()
  const quote = q as Quote | null
  if (job.status === 'quoted' && quote?.status !== 'accepted') return { ok: false, error: 'Withdraw or decline the quote instead.' }
  const text = reason.trim().slice(0, 1000)
  if (text.length < 3) return { ok: false, error: 'Give a short reason.' }

  const now = new Date()
  const { data: dep } = await s.admin.from('payment_stages').select('*').eq('job_id', jobId).eq('is_deposit', true).maybeSingle()
  const pos = depositPosition(job, quote, dep as PaymentStage | null, now)
  await s.admin.from('payment_stages').update({ status: 'cancelled', cancelled_at: now.toISOString() }).eq('job_id', jobId).eq('status', 'upcoming')
  // An unpaid deposit on a job that never started is no longer due
  if (dep && !job.started_at && (dep.amount_paid_pence as number) === 0) await s.admin.from('payment_stages').update({ status: 'cancelled', cancelled_at: now.toISOString() }).eq('id', dep.id)
  await s.admin.from('jobs').update({
    status: 'cancelled', cancelled_at: now.toISOString(), cancelled_by_user_id: s.userId, cancellation_reason: text,
    deposit_outcome: pos.outcome === 'refund_due' || pos.outcome === 'needs_trade_answer' ? 'refund_due' : pos.outcome === 'retained' ? 'retained' : null,
  }).eq('id', jobId)
  const who = job.trade_user_id === s.userId ? 'The trade' : 'The client'
  await logJobEvent(s.admin, jobId, 'cancelled', `${who} cancelled the job. ${pos.explanation}`, s.userId, { reason: text, deposit: pos })
  if (job.started_at) await openReviewWindow(s.admin, jobId, 'cancelled_after_start')

  const link = `/jobs/${jobId}`
  if (job.trade_user_id && job.client_user_id) {
    if (s.userId === job.trade_user_id) {
      const sender = await getTradeSender(s.admin, job.trade_user_id)
      const clientLink = await createAccessLink(s.admin, { clientUserId: job.client_user_id, purpose: 'job', targetPath: `/my/jobs/${jobId}`, createdBy: job.trade_user_id })
      await messageClient(s.admin, { tradeUserId: job.trade_user_id, clientUserId: job.client_user_id, email: jobCancelledEmail({ who: sender.businessName, title: job.title ?? 'your job', reason: text, link: clientLink, depositNote: pos.outcome === 'none' ? null : pos.explanation }) })
    } else {
      const client = await nameOf(s.admin, job.client_user_id)
      await messageTrade(s.admin, { tradeUserId: job.trade_user_id, type: 'job', title: `Job cancelled: ${job.title ?? ''}`, body: `${client}: ${text}`, link, email: jobCancelledEmail({ who: client, title: job.title ?? 'the job', reason: text, link: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}${link}`, depositNote: pos.outcome === 'none' ? null : pos.explanation }) })
    }
  }
  revalidate(jobId)
  return { ok: true }
}

/** Person client cancelled in their 14 days: the trade confirms whether materials were made to measure. */
export async function confirmMadeToMeasure(jobId: string, madeToMeasure: boolean): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: job } = await s.admin.from('jobs').select('trade_user_id, made_to_measure_confirmed').eq('id', jobId).maybeSingle()
  if (!job || job.trade_user_id !== s.userId) return { ok: false, error: 'Job not found.' }
  await s.admin.from('jobs').update({ made_to_measure_confirmed: madeToMeasure, deposit_outcome: madeToMeasure ? 'retained' : 'refund_due' }).eq('id', jobId)
  await logJobEvent(s.admin, jobId, 'made_to_measure', madeToMeasure ? 'Trade confirmed the materials were made to measure or made to order, so the deposit is kept.' : 'Trade confirmed the materials were not made to measure, so the deposit is refundable.', s.userId)
  revalidate(jobId)
  return { ok: true }
}

// ── Both sides ────────────────────────────────────────────────

export async function addIssueNote(issueId: string, note: string, photoPaths: string[]): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: issue } = await s.admin.from('stage_issues').select('stage_id, status').eq('id', issueId).maybeSingle()
  if (!issue) return { ok: false, error: 'Issue not found.' }
  const c = await stageCtx(issue.stage_id)
  if (!c) return { ok: false, error: 'Issue not found.' }
  const text = note.trim().slice(0, 1000)
  if (!text) return { ok: false, error: 'Write a note.' }
  await s.admin.from('issue_notes').insert({ issue_id: issueId, author_user_id: s.userId, note: text, photo_paths: photoPaths.slice(0, 5) })
  if (c.role === 'trade') {
    await s.admin.from('payment_stages').update({ last_trade_response_at: new Date().toISOString() }).eq('id', c.stage.id)
    await tellClient(c, 'issue_reply')
  } else {
    await tellTrade(c, 'issue_reply', text)
  }
  await logJobEvent(s.admin, c.job.id, 'issue_note', `${c.role === 'trade' ? 'Trade' : 'Client'} added a note to the issue on ${c.stage.name}`, s.userId, { note: text })
  revalidate(c.job.id)
  return { ok: true }
}

// ── Client ────────────────────────────────────────────────────

/** Approve a stage from the client's own account (key rule 3). It becomes due within the trade's terms. */
export async function approveStage(stageId: string): Promise<R> {
  const c = await stageCtx(stageId)
  if (!c || c.role !== 'client') return { ok: false, error: 'Please sign in to approve.' }
  if (!['awaiting_approval', 'issue_raised', 'requested_by_trade', 'part_paid', 'overdue'].includes(c.stage.status) || c.stage.approved_at) return { ok: false, error: 'This stage can’t be approved now.' }
  if (['part_paid', 'overdue'].includes(c.stage.status) && !c.stage.requested_by_trade_at) return { ok: false, error: 'This stage can’t be approved now.' }
  const now = new Date().toISOString()
  const wasRequested = !!c.stage.requested_by_trade_at
  await c.admin.from('payment_stages').update({
    approved_at: now, approved_by_user_id: c.userId,
    ...(c.stage.status === 'requested_by_trade' ? { status: 'approved' as const } : {}),
    ...(wasRequested ? {} : { status: 'approved' as const, due_at: await dueAt(c) }),
  }).eq('id', stageId)
  await c.admin.from('stage_issues').update({ status: 'resolved', resolved_at: now }).eq('stage_id', stageId).in('status', ['open', 'resubmitted', 'closed_by_request'])
  await logJobEvent(c.admin, c.job.id, 'stage_approved', `Client approved ${c.stage.name} in their account`, c.userId)
  if (wasRequested) {
    await c.admin.from('invoices').update({ approval_basis: 'client_approved' }).eq('stage_id', stageId).neq('status', 'credited')
  } else {
    await onStageDue(c.admin, stageId)
  }
  await tellTrade(c, 'approved')
  await refreshCompletion(c.admin, c.job.id)
  revalidate(c.job.id)
  return { ok: true }
}

/** Raise an issue with a reason and optional photos. Chasing on the stage pauses (PRD 9, 10). */
export async function raiseStageIssue(stageId: string, reason: string, photoPaths: string[]): Promise<R> {
  const c = await stageCtx(stageId)
  if (!c || c.role !== 'client') return { ok: false, error: 'Please sign in.' }
  if (!['awaiting_approval', 'requested_by_trade'].includes(c.stage.status)) return { ok: false, error: 'You can raise an issue on a stage waiting for your approval.' }
  const text = reason.trim().slice(0, 1000)
  if (text.length < 5) return { ok: false, error: 'Explain briefly what is wrong.' }
  await c.admin.from('stage_issues').insert({ stage_id: stageId, raised_by_user_id: c.userId, reason: text, photo_paths: photoPaths.slice(0, 5) })
  // On a requested stage the issue stays visible on the record, but the stage stays due (PRD 9)
  if (c.stage.status === 'awaiting_approval') await c.admin.from('payment_stages').update({ status: 'issue_raised' }).eq('id', stageId)
  await logJobEvent(c.admin, c.job.id, 'issue_raised', `Client raised an issue on ${c.stage.name}`, c.userId, { reason: text })
  await tellTrade(c, 'issue', text)
  revalidate(c.job.id)
  return { ok: true }
}

/** "I've paid": pauses chasing for up to 3 working days and tells the trade. It never marks anything paid. */
export async function clientSaysPaid(stageId: string): Promise<R> {
  const c = await stageCtx(stageId)
  if (!c || c.role !== 'client') return { ok: false, error: 'Please sign in.' }
  if (!['approved', 'requested_by_trade', 'part_paid', 'overdue'].includes(c.stage.status)) return { ok: false, error: 'Nothing is due on this stage.' }
  await c.admin.from('payment_stages').update({ client_says_paid_at: new Date().toISOString() }).eq('id', stageId)
  await logJobEvent(c.admin, c.job.id, 'client_says_paid', `Client says they have paid ${c.stage.name}`, c.userId)
  await tellTrade(c, 'client_says_paid')
  revalidate(c.job.id)
  return { ok: true }
}

/** The client confirms (or disputes) a payment the trade marked as paid elsewhere, or a refund. */
export async function clientConfirmPayment(paymentId: string, kind: 'paid_elsewhere' | 'refund', yes: boolean): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: p } = await s.admin.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (!p) return { ok: false, error: 'Payment not found.' }
  const { data: job } = await s.admin.from('jobs').select('id, client_user_id, trade_user_id, title').eq('id', p.job_id).maybeSingle()
  if (!job || job.client_user_id !== s.userId) return { ok: false, error: 'Payment not found.' }
  const now = new Date().toISOString()
  if (kind === 'refund') {
    await s.admin.from('payments').update(yes ? { refund_client_confirmed_at: now } : { client_disputed_at: now }).eq('id', paymentId)
    if (yes) {
      const { data: st } = await s.admin.from('payment_stages').select('is_deposit').eq('id', p.stage_id).maybeSingle()
      if (st?.is_deposit) await s.admin.from('jobs').update({ deposit_outcome: 'refunded' }).eq('id', job.id)
    }
  } else {
    await s.admin.from('payments').update(yes ? { client_confirmed_at: now } : { client_disputed_at: now }).eq('id', paymentId)
  }
  await logJobEvent(s.admin, job.id, 'payment_confirmation', yes ? `Client confirmed the ${kind === 'refund' ? 'refund' : 'payment'} of ${formatPence(kind === 'refund' ? p.refunded_pence : p.amount_pence)}` : `Client says the ${kind === 'refund' ? 'refund has not arrived' : 'payment was not made that way'}`, s.userId)
  if (!yes && job.trade_user_id) {
    await messageTrade(s.admin, { tradeUserId: job.trade_user_id, type: 'payment', title: kind === 'refund' ? 'Client says the refund hasn’t arrived' : 'Client says they didn’t pay that way', body: `${job.title ?? ''}: ${formatPence(p.amount_pence)}. This is flagged to both of you and to WorkedWith.`, link: `/jobs/${job.id}` })
  }
  revalidate(job.id)
  return { ok: true }
}
