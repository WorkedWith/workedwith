'use server'

import { revalidatePath } from 'next/cache'
import { getUserSession } from '@/lib/auth/require-trade'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient, messageTrade } from '@/lib/messages/send'
import { jobEventClientEmail, jobEventTradeEmail } from '@/lib/email/templates-v42'
import { smsConsentRequested, smsStartProposed } from '@/lib/sms/copy-v42'
import { logJobEvent, needsConsentToStartOn } from '@/lib/jobs/events'
import { EARLY_START_CONSENT } from '@/lib/quotes/wording'
import type { Job } from '@/types/database'

type R = { ok: true } | { ok: false; error: string }

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

async function jobFor(jobId: string) {
  const s = await getUserSession()
  if (!s) return null
  const { data } = await s.admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  const job = data as unknown as Job | null
  if (!job || job.flow !== 'quote') return null
  const role = job.trade_user_id === s.userId ? 'trade' : job.client_user_id === s.userId ? 'client' : null
  if (!role) return null
  return { ...s, job, role: role as 'trade' | 'client' }
}

function revalidate(jobId: string) {
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/my/jobs/${jobId}`)
}

async function clientName(admin: Awaited<ReturnType<typeof jobFor>> extends infer T ? T extends { admin: infer A } ? A : never : never, userId: string | null): Promise<string> {
  if (!userId) return 'The client'
  const { data } = await admin.from('users').select('full_name').eq('id', userId).maybeSingle()
  return (data?.full_name as string | undefined) ?? 'The client'
}

/**
 * Propose a planned start (PRD 7). Either side can propose; the other confirms. A client suggesting a date
 * inside their 14 days gives the early start consent with it.
 */
export async function proposeStartDate(jobId: string, date: string, consent = false): Promise<R> {
  const c = await jobFor(jobId)
  if (!c) return { ok: false, error: 'Job not found.' }
  const { admin, job, role, userId } = c
  if (!['booked', 'quoted', 'in_progress'].includes(job.status)) return { ok: false, error: 'You can’t change the start date now.' }
  if (job.started_at) return { ok: false, error: 'The job has already started.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date) < new Date(new Date().toISOString().slice(0, 10))) return { ok: false, error: 'Pick a date from today onwards.' }
  if (role === 'client' && needsConsentToStartOn(job, new Date(date)) && !consent) {
    return { ok: false, error: 'That date is inside your 14 day cancellation period. Tick the box to ask for an early start, or pick a later date.' }
  }

  await admin.from('start_date_proposals').update({ status: 'countered', decided_at: new Date().toISOString(), decided_by_user_id: userId }).eq('job_id', jobId).eq('status', 'proposed')
  await admin.from('start_date_proposals').insert({ job_id: jobId, proposed_date: date, proposed_by_user_id: userId, early_start_consent_given: role === 'client' && consent })
  await logJobEvent(admin, jobId, 'start_proposed', `${role === 'trade' ? 'Trade' : 'Client'} proposed a planned start of ${fmt(date)}`, userId, { date })

  if (role === 'trade' && job.client_user_id) {
    const sender = await getTradeSender(admin, userId)
    const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'job', targetPath: `/my/jobs/${jobId}`, createdBy: userId })
    await messageClient(admin, { tradeUserId: userId, clientUserId: job.client_user_id, email: jobEventClientEmail({ business: sender.businessName, title: job.title ?? 'your job', link, event: 'start_proposed', date: fmt(date) }), sms: smsStartProposed(sender.businessName, fmt(date), link) })
  } else if (role === 'client' && job.trade_user_id) {
    const name = await clientName(admin, userId)
    await messageTrade(admin, { tradeUserId: job.trade_user_id, type: 'job', title: `${name} suggested ${fmt(date)}`, body: job.title ?? '', link: `/jobs/${jobId}`, email: jobEventTradeEmail({ client: name, title: job.title ?? 'the job', jobId, event: 'start_countered', date: fmt(date) }) })
  }
  revalidate(jobId)
  return { ok: true }
}

/** Confirm the other side's proposal. A client confirming a date inside their 14 days must give consent. */
export async function confirmStartDate(proposalId: string, consent = false): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: p } = await s.admin.from('start_date_proposals').select('*').eq('id', proposalId).maybeSingle()
  if (!p || p.status !== 'proposed') return { ok: false, error: 'That date is no longer open.' }
  const c = await jobFor(p.job_id)
  if (!c) return { ok: false, error: 'Job not found.' }
  const { admin, job, role, userId } = c
  if (p.proposed_by_user_id === userId) return { ok: false, error: 'The other side needs to confirm this date.' }

  const inside = needsConsentToStartOn(job, new Date(p.proposed_date))
  if (role === 'client' && inside && !consent) {
    return { ok: false, error: 'This date is inside your 14 day cancellation period. Tick the box to ask for the work to start early, or suggest a later date.' }
  }
  const now = new Date().toISOString()
  await admin.from('start_date_proposals').update({ status: 'confirmed', decided_at: now, decided_by_user_id: userId, early_start_consent_given: p.early_start_consent_given || (role === 'client' && consent) }).eq('id', proposalId)
  const consentNow = inside && (p.early_start_consent_given || (role === 'client' && consent))
  await admin.from('jobs').update({
    agreed_start_date: p.proposed_date,
    ...(consentNow ? { early_start_consent_at: now, early_start_consent_by_user_id: job.client_user_id } : {}),
  }).eq('id', job.id)
  await logJobEvent(admin, job.id, 'start_confirmed', `Planned start agreed: ${fmt(p.proposed_date)}${consentNow ? '. Client asked for an early start within the cancellation period.' : ''}`, userId, { date: p.proposed_date, consent: consentNow, consentWording: consentNow ? EARLY_START_CONSENT : null })

  if (role === 'client' && job.trade_user_id) {
    const name = await clientName(admin, userId)
    await messageTrade(admin, { tradeUserId: job.trade_user_id, type: 'job', title: `Start date confirmed: ${fmt(p.proposed_date)}`, body: job.title ?? '', link: `/jobs/${job.id}`, email: jobEventTradeEmail({ client: name, title: job.title ?? 'the job', jobId: job.id, event: 'start_confirmed', date: fmt(p.proposed_date) }) })
  } else if (role === 'trade' && job.client_user_id) {
    const sender = await getTradeSender(admin, userId)
    const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'job', targetPath: `/my/jobs/${job.id}`, createdBy: userId })
    await messageClient(admin, { tradeUserId: userId, clientUserId: job.client_user_id, email: jobEventClientEmail({ business: sender.businessName, title: job.title ?? 'your job', link, event: 'start_confirmed', date: fmt(p.proposed_date) }) })
  }
  revalidate(job.id)
  return { ok: true }
}

/** "Materials ordered" (PRD 7). The client is told straight away, and the date is recorded. */
export async function markMaterialsOrdered(jobId: string, photoPath: string | null): Promise<R> {
  const c = await jobFor(jobId)
  if (!c || c.role !== 'trade') return { ok: false, error: 'Job not found.' }
  const { admin, job, userId } = c
  if (job.materials_ordered_at) return { ok: false, error: 'Materials are already marked as ordered.' }
  if (!['booked', 'in_progress'].includes(job.status)) return { ok: false, error: 'The job needs to be booked first.' }
  const now = new Date().toISOString()
  await admin.from('jobs').update({ materials_ordered_at: now, materials_order_evidence_path: photoPath }).eq('id', jobId)
  await logJobEvent(admin, jobId, 'materials_ordered', 'Materials ordered', userId, { photo: photoPath })
  if (job.client_user_id) {
    const sender = await getTradeSender(admin, userId)
    const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'job', targetPath: `/my/jobs/${jobId}`, createdBy: userId })
    await messageClient(admin, { tradeUserId: userId, clientUserId: job.client_user_id, email: jobEventClientEmail({ business: sender.businessName, title: job.title ?? 'your job', link, event: 'materials_ordered' }) })
  }
  revalidate(jobId)
  return { ok: true }
}

/** Mark started (PRD 7). Blocked inside a person client's 14 days without their early start consent. */
export async function markJobStarted(jobId: string): Promise<R> {
  const c = await jobFor(jobId)
  if (!c || c.role !== 'trade') return { ok: false, error: 'Job not found.' }
  const { admin, job, userId } = c
  if (job.status !== 'booked') return { ok: false, error: job.status === 'quoted' ? 'The job is booked once the quote is accepted and any deposit is paid.' : 'The job has already started.' }
  if (needsConsentToStartOn(job, new Date())) {
    return { ok: false, error: 'The client is still inside their 14 day cancellation period and hasn’t asked for an early start. Send them the request first.' }
  }
  const now = new Date().toISOString()
  await admin.from('jobs').update({ status: 'in_progress', started_at: now }).eq('id', jobId)
  await logJobEvent(admin, jobId, 'started', 'Job marked started', userId)
  if (job.client_user_id) {
    const sender = await getTradeSender(admin, userId)
    const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'job', targetPath: `/my/jobs/${jobId}`, createdBy: userId })
    await messageClient(admin, { tradeUserId: userId, clientUserId: job.client_user_id, email: jobEventClientEmail({ business: sender.businessName, title: job.title ?? 'your job', link, event: 'started' }) })
  }
  revalidate(jobId)
  return { ok: true }
}

export async function requestEarlyStartConsent(jobId: string): Promise<R> {
  const c = await jobFor(jobId)
  if (!c || c.role !== 'trade') return { ok: false, error: 'Job not found.' }
  const { admin, job, userId } = c
  if (job.early_start_consent_at) return { ok: false, error: 'The client has already agreed to an early start.' }
  if (job.early_start_requested_at && Date.now() - new Date(job.early_start_requested_at).getTime() < 86_400_000) return { ok: false, error: 'You sent a request today. Try again tomorrow.' }
  await admin.from('jobs').update({ early_start_requested_at: new Date().toISOString() }).eq('id', jobId)
  await logJobEvent(admin, jobId, 'consent_requested', 'Trade asked the client for an early start', userId)
  if (job.client_user_id) {
    const sender = await getTradeSender(admin, userId)
    const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'job', targetPath: `/my/jobs/${jobId}`, createdBy: userId })
    await messageClient(admin, { tradeUserId: userId, clientUserId: job.client_user_id, email: jobEventClientEmail({ business: sender.businessName, title: job.title ?? 'your job', link, event: 'consent_requested' }), sms: smsConsentRequested(sender.businessName, link) })
  }
  revalidate(jobId)
  return { ok: true }
}

/** The client asks for the work to start within their 14 days, from their own account. */
export async function giveEarlyStartConsent(jobId: string): Promise<R> {
  const c = await jobFor(jobId)
  if (!c || c.role !== 'client') return { ok: false, error: 'Please sign in to answer.' }
  const { admin, job, userId } = c
  if (job.early_start_consent_at) return { ok: true }
  const now = new Date().toISOString()
  await admin.from('jobs').update({ early_start_consent_at: now, early_start_consent_by_user_id: userId }).eq('id', jobId)
  await logJobEvent(admin, jobId, 'consent_given', 'Client asked for the work to start within the cancellation period', userId, { wording: EARLY_START_CONSENT })
  if (job.trade_user_id) {
    const name = await clientName(admin, userId)
    await messageTrade(admin, { tradeUserId: job.trade_user_id, type: 'job', title: 'Early start agreed', body: job.title ?? '', link: `/jobs/${jobId}`, email: jobEventTradeEmail({ client: name, title: job.title ?? 'the job', jobId, event: 'consent_given' }) })
  }
  revalidate(jobId)
  return { ok: true }
}
