'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { jobEndedEarly, jobOutcomeDisputed, clientSaysFinished } from '@/lib/email/templates'
import { loadJobParties } from '@/lib/job-parties'
import { jobLabel } from '@/lib/trade-types'
import { actingPartyId } from '@/lib/org-access'

type Result = { success: true } | { success: false; error: string }

import { ENDED_EARLY_MIN_HOURS, OBJECTION_DAYS, NOTE_MAX } from '@/lib/ended-early'

async function who() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function notify(admin: ReturnType<typeof createAdminClient>, userId: string | null, type: 'job_confirmed' | 'review_window_opened', title: string, body: string, link: string) {
  if (!userId) return
  await admin.from('notifications').insert({ user_id: userId, type, title, body, link })
}

/** Either side marks an active job as ended early. Opens the review window straight away. */
export async function endJobEarly(jobId: string, note: string): Promise<Result> {
  const user = await who()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()
  const p = await loadJobParties(admin, jobId)
  if (!p) return { success: false, error: 'Job not found.' }

  const isTrade = p.tradeUserId === user.id
  const clientSeat = await actingPartyId(admin, user.id, p.clientUserId)
  const isClient = !!clientSeat
  const myId = isClient ? (clientSeat as string) : user.id
  if (!isTrade && !isClient) return { success: false, error: 'Only the two people on the job can do this.' }
  if (p.job.status !== 'active') return { success: false, error: 'Only a job that is underway can be marked as ended early.' }
  if (p.job.is_backdated) return { success: false, error: 'A past job cannot be marked as ended early. Say so in your review.' }

  const since = p.job.confirmed_at ?? p.job.created_at
  if (Date.now() - new Date(since).getTime() < ENDED_EARLY_MIN_HOURS * 3_600_000) {
    return { success: false, error: 'A job needs to have been going for at least a day first.' }
  }
  const cleanNote = note.trim().slice(0, NOTE_MAX)

  const now = new Date()
  const { error } = await admin.from('jobs').update({
    status: 'ended_early',
    ended_early_at: now.toISOString(),
    updated_at: now.toISOString(),
  }).eq('id', jobId).eq('status', 'active')
  if (error) return { success: false, error: 'Could not update the job. Please try again.' }

  await admin.from('job_early_end_details').upsert({ job_id: jobId, ended_by: myId, acted_by_user_id: user.id, note: cleanNote || null })

  const { data: existing } = await admin.from('review_windows').select('id').eq('job_id', jobId).maybeSingle()
  if (!existing) {
    await admin.from('review_windows').insert({
      job_id: jobId,
      window_opened_at: now.toISOString(),
      window_closes_at: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
      blind_window_closes_at: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
    })
  }

  const otherId = isTrade ? p.clientUserId : p.tradeUserId
  const otherEmail = isTrade ? p.clientEmail : p.tradeEmail
  const myName = isTrade ? p.tradeName : p.clientName
  const label = jobLabel(p.job.job_type)
  await Promise.all([
    notify(admin, otherId, 'review_window_opened', 'A job was marked as ended early', `The ${label} was marked as ended early. You can both leave a review now.`, `/jobs/${jobId}/status`),
    notify(admin, myId, 'review_window_opened', 'You can leave a review', `The ${label} is marked as ended early. You can both leave a review now.`, `/jobs/${jobId}/review`),
  ])
  if (otherEmail) {
    const r = await sendEmail(otherEmail, jobEndedEarly({ name: myName, jobType: p.job.job_type, jobId }))
    if (!r.ok) console.error('Ended early email failed (non-fatal):', r.error)
  }

  revalidatePath('/dashboard')
  revalidatePath(`/jobs/${jobId}/status`)
  return { success: true }
}

/** The other side says the job was actually finished. */
export async function objectToEndedEarly(jobId: string): Promise<Result> {
  const user = await who()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()
  const p = await loadJobParties(admin, jobId)
  if (!p) return { success: false, error: 'Job not found.' }
  if (p.job.status !== 'ended_early' || !p.job.ended_early_at) return { success: false, error: 'This job is not marked as ended early.' }
  if (p.job.outcome_disputed) return { success: false, error: 'You have already said this job was finished.' }

  const { data: details } = await admin.from('job_early_end_details').select('ended_by').eq('job_id', jobId).maybeSingle()
  const endedBy = (details?.ended_by as string | null | undefined) ?? null
  const clientSeat = await actingPartyId(admin, user.id, p.clientUserId)
  const myId = clientSeat ?? user.id
  const isParty = user.id === p.tradeUserId || !!clientSeat
  if (!isParty) return { success: false, error: 'Only the two people on the job can do this.' }
  if (endedBy === myId) return { success: false, error: 'You marked this job as ended early, so you cannot object to it.' }

  if (Date.now() - new Date(p.job.ended_early_at).getTime() > OBJECTION_DAYS * 86_400_000) {
    return { success: false, error: 'The 7 days to say this have passed. You can say what happened in your review.' }
  }

  const now = new Date().toISOString()
  await admin.from('jobs').update({ outcome_disputed: true, outcome_disputed_at: now, updated_at: now }).eq('id', jobId)

  const iAmTrade = user.id === p.tradeUserId && !clientSeat
  const markerId = iAmTrade ? p.clientUserId : p.tradeUserId
  const markerEmail = iAmTrade ? p.clientEmail : p.tradeEmail
  const myName = iAmTrade ? p.tradeName : p.clientName
  await notify(admin, markerId, 'job_confirmed', 'The other side says the job was finished', `It now shows as "Outcome disputed". Your reviews stay open.`, `/jobs/${jobId}/review`)
  if (markerEmail) {
    const r = await sendEmail(markerEmail, jobOutcomeDisputed({ name: myName, jobType: p.job.job_type, jobId }))
    if (!r.ok) console.error('Outcome disputed email failed (non-fatal):', r.error)
  }
  revalidatePath(`/jobs/${jobId}/status`)
  return { success: true }
}

/** A client says an active job is finished. Only the tradesperson can mark it complete, so we ask them to. */
export async function clientSaysJobFinished(jobId: string): Promise<Result> {
  const user = await who()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()
  const p = await loadJobParties(admin, jobId)
  if (!p || !(await actingPartyId(admin, user.id, p.clientUserId))) return { success: false, error: 'Job not found.' }
  if (p.job.status !== 'active') return { success: false, error: 'This job is not underway.' }
  await notify(admin, p.tradeUserId, 'job_confirmed', `${p.clientName} says the job is finished`, 'If you agree, mark it complete so you can both leave a review.', `/jobs/${jobId}`)
  if (p.tradeEmail) {
    const r = await sendEmail(p.tradeEmail, clientSaysFinished({ name: p.clientName, jobType: p.job.job_type, jobId }))
    if (!r.ok) console.error('Client finished email failed (non-fatal):', r.error)
  }
  return { success: true }
}

/** "It's still going": nothing changes and we ask again in 90 days. */
export async function jobStillGoing(jobId: string): Promise<Result> {
  const user = await who()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()
  const p = await loadJobParties(admin, jobId)
  if (!p || (p.tradeUserId !== user.id && !(await actingPartyId(admin, user.id, p.clientUserId)))) return { success: false, error: 'Job not found.' }
  await admin.from('jobs').update({ last_stale_prompt_at: new Date().toISOString() }).eq('id', jobId)
  return { success: true }
}
