import { sendEmail } from '@/lib/email/send'
import { evidenceDecision } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateJob } from '@/lib/integrity/evaluate'
import { recordRequestOutcome } from '@/lib/request-outcomes'
import { loadRequest, addDays, type RequestInfo } from '@/lib/evidence'
import { jobLabel } from '@/lib/trade-types'
import type { JobEvidenceClaim } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

export type OutcomeResult = { ok: true } | { ok: false; error: string }

async function notifyBoth(admin: AdminClient, claim: JobEvidenceClaim, confirmed: boolean, jobId: string | null, jobType: string): Promise<void> {
  const body = confirmed
    ? `We have looked at both sides. The ${jobLabel(jobType)} is confirmed and you can now each leave a review.`
    : `We have looked at both sides. The ${jobLabel(jobType)} request stays declined.`
  const link = confirmed && jobId ? `/jobs/${jobId}/review` : '/dashboard'
  await Promise.all([claim.requester_id, claim.respondent_id].map(uid =>
    admin.from('notifications').insert({
      user_id: uid,
      type: confirmed ? 'review_window_opened' : 'job_confirmed',
      title: 'We have decided on the job request',
      body,
      link,
    }),
  ))
  const { data: people } = await admin.from('users').select('id, email').in('id', [claim.requester_id, claim.respondent_id])
  for (const p of (people ?? []) as unknown as { id: string; email: string | null }[]) {
    if (!p.email) continue
    const r = await sendEmail(p.email, evidenceDecision({ confirmed }))
    if (!r.ok) console.error('Evidence decision email failed (non-fatal):', r.error)
  }
}

/**
 * The claim is upheld (by an admin, or because the respondent confirmed): the job becomes a normal
 * confirmed job and the earlier decline counts as not confirmed.
 */
export async function applyUpheld(
  admin: AdminClient,
  claim: JobEvidenceClaim,
  decidedBy: string | null,
  how: 'admin' | 'respondent_confirmed',
): Promise<OutcomeResult> {
  const req = await loadRequest(admin, claim.invite_id)
  if (!req || !req.respondentId) return { ok: false, error: 'The original request could not be found.' }

  const nowDate = new Date()
  const now = nowDate.toISOString()
  const today = now.split('T')[0]
  let jobId: string | null = null

  if (req.kind === 'pending_invite') {
    const { data: invite } = await admin.from('pending_invites').select('*').eq('id', req.id).single()
    if (!invite) return { ok: false, error: 'Request not found.' }
    const [{ data: tradeProfile }, { data: clientProfile }] = await Promise.all([
      admin.from('trade_profiles').select('id, total_jobs').eq('user_id', req.respondentId).maybeSingle(),
      admin.from('client_profiles').select('id').eq('user_id', req.requesterId).maybeSingle(),
    ])
    if (!tradeProfile) return { ok: false, error: 'The tradesperson has no trade profile.' }
    if (!clientProfile) return { ok: false, error: 'The client has no client profile.' }

    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .insert({
        job_type: invite.job_type as string,
        trade_profile_id: tradeProfile.id as string,
        client_profile_id: clientProfile.id as string,
        initiated_by: 'client',
        description: (invite.description as string | null) ?? null,
        is_backdated: invite.job_state !== 'in_progress',
        backdated_period: invite.job_state === 'in_progress' ? null : (invite.job_date as string),
        started_at: invite.job_state === 'in_progress' ? ((invite.job_month as string | null) ?? null) : null,
        postcode: (invite.postcode_district as string | null) ?? null,
        status: 'active',
        confirmed_at: now,
      })
      .select('id')
      .single()
    if (jobErr || !job) return { ok: false, error: 'Could not create the job.' }
    jobId = job.id as string

    if (invite.job_state !== 'in_progress') {
      await admin.from('review_windows').insert({
        job_id: jobId,
        window_opened_at: now,
        blind_window_closes_at: addDays(nowDate, 7).toISOString(),
        window_closes_at: addDays(nowDate, 30).toISOString(),
        trade_review_submitted: false,
        client_review_submitted: false,
      })
    }
    await admin.from('pending_invites').update({
      status: 'claimed',
      claimed_by_user_id: req.respondentId,
      claimed_at: now,
      resulting_job_id: jobId,
      overturned_at: now,
    }).eq('id', req.id)
    await admin.from('trade_profiles').update({ total_jobs: ((tradeProfile.total_jobs as number | null) ?? 0) + 1 }).eq('id', tradeProfile.id as string)
  } else {
    if (!req.jobId) return { ok: false, error: 'The job could not be found.' }
    const { data: job } = await admin.from('jobs').select('*').eq('id', req.jobId).single()
    if (!job) return { ok: false, error: 'The job could not be found.' }
    let clientProfileId = job.client_profile_id as string | null
    if (!clientProfileId) {
      const { data: cp } = await admin.from('client_profiles').select('id').eq('user_id', req.respondentId).maybeSingle()
      if (!cp) return { ok: false, error: 'The client has no client profile.' }
      clientProfileId = cp.id as string
    }
    const backdated = !!job.is_backdated
    const { error: jobErr } = await admin.from('jobs').update({
      status: backdated ? 'completed' : 'active',
      confirmed_at: now,
      updated_at: now,
      client_profile_id: clientProfileId,
      ...(backdated ? { completed_at: today } : {}),
    }).eq('id', job.id as string)
    if (jobErr) return { ok: false, error: 'Could not update the job.' }
    jobId = job.id as string

    if (backdated) {
      const { data: existingWindow } = await admin.from('review_windows').select('id').eq('job_id', jobId).maybeSingle()
      const closes = addDays(nowDate, 30).toISOString()
      const blind = addDays(nowDate, 7).toISOString()
      if (existingWindow) {
        await admin.from('review_windows').update({ window_closes_at: closes, blind_window_closes_at: blind }).eq('job_id', jobId)
      } else {
        await admin.from('review_windows').insert({ job_id: jobId, window_opened_at: now, window_closes_at: closes, blind_window_closes_at: blind })
      }
    }
    await admin.from('job_invites').update({ status: 'accepted', responded_at: now, overturned_at: now }).eq('id', req.id)
  }

  // The decline now counts as not confirmed
  await recordRequestOutcome(admin, {
    kind: req.kind,
    requestId: req.id,
    recipientId: req.respondentId,
    requesterId: req.requesterId,
    outcome: 'overturned',
    requestedAt: req.requestedAt,
  })

  await admin.from('job_evidence_claims').update({
    status: 'upheld', decided_at: now, decided_by: decidedBy, decided_how: how,
  }).eq('id', claim.id)

  // A false "that's not me" is worth a human look
  if (how === 'admin' && req.declineReason === 'not_me') {
    await admin.from('review_integrity_flags').insert({
      job_id: jobId,
      flag_type: 'false_decline',
      details: `Declined as "not me" (user ${req.respondentId}); evidence claim ${claim.id} was upheld, so the job did happen.`,
    })
  }

  await notifyBoth(admin, claim, true, jobId, req.jobType)
  if (jobId) await evaluateJob(admin, jobId)
  return { ok: true }
}

export async function applyNotUpheld(admin: AdminClient, claim: JobEvidenceClaim, decidedBy: string | null, req?: RequestInfo | null): Promise<OutcomeResult> {
  const now = new Date().toISOString()
  await admin.from('job_evidence_claims').update({
    status: 'not_upheld', decided_at: now, decided_by: decidedBy, decided_how: 'admin',
  }).eq('id', claim.id)

  const info = req ?? (await loadRequest(admin, claim.invite_id))
  await notifyBoth(admin, claim, false, null, info?.jobType ?? 'job')

  // Repeated unfounded claims from one person
  const { count } = await admin
    .from('job_evidence_claims')
    .select('id', { count: 'exact', head: true })
    .eq('requester_id', claim.requester_id)
    .eq('status', 'not_upheld')
  if ((count ?? 0) >= 3) {
    const marker = `requester ${claim.requester_id}`
    const { data: open } = await admin
      .from('review_integrity_flags')
      .select('id, details')
      .eq('flag_type', 'repeated_unfounded_claims')
      .eq('outcome', 'pending')
    const already = ((open ?? []) as unknown as { id: string; details: string | null }[]).some(f => (f.details ?? '').includes(marker))
    if (!already) {
      await admin.from('review_integrity_flags').insert({
        flag_type: 'repeated_unfounded_claims',
        details: `Evidence claims from ${marker} have been not upheld ${count} times.`,
      })
    }
  }
  return { ok: true }
}
