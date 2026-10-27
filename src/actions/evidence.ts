'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { sendEmail } from '@/lib/email/send'
import { evidenceReceived } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyUpheld } from '@/lib/evidence-outcome'
import {
  ALLOWED_EVIDENCE_MIME,
  DECISION_DAYS,
  EVIDENCE_TYPES,
  EVIDENCE_WINDOW_DAYS,
  MAX_CLAIMS_PER_30_DAYS,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILE_BYTES,
  RESPONSE_DAYS,
  STATEMENT_MAX,
  addDays,
  fmtDate,
  loadRequest,
} from '@/lib/evidence'
import type { EvidenceType, JobEvidenceClaim, JobEvidenceFile } from '@/types/database'

type Result<T extends object = object> = ({ success: true } & T) | { success: false; error: string }

async function currentUser(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function getClaim(admin: ReturnType<typeof createAdminClient>, claimId: string): Promise<JobEvidenceClaim | null> {
  const { data } = await admin.from('job_evidence_claims').select('*').eq('id', claimId).maybeSingle()
  return (data as unknown as JobEvidenceClaim | null) ?? null
}

// ── Requester ─────────────────────────────────────────────────

/** Starts (or reopens) a draft claim for a declined request. Files are added next, then finishEvidenceClaim. */
export async function startEvidenceClaim(requestId: string, statement: string): Promise<Result<{ claimId: string }>> {
  const userId = await currentUser()
  if (!userId) return { success: false, error: 'You must be signed in.' }

  const text = statement.trim()
  if (text.length < 10) return { success: false, error: 'Please tell us a little about the job, at least a sentence.' }
  if (text.length > STATEMENT_MAX) return { success: false, error: `Please keep it to ${STATEMENT_MAX} characters.` }

  const admin = createAdminClient()
  const req = await loadRequest(admin, requestId)
  if (!req || req.requesterId !== userId) return { success: false, error: 'Request not found.' }
  if (!req.declined || !req.respondentId || !req.declinedAt) return { success: false, error: 'This request has not been declined.' }
  if (req.overturned) return { success: false, error: 'This request has already been confirmed.' }
  if (Date.now() > addDays(new Date(req.declinedAt), EVIDENCE_WINDOW_DAYS).getTime()) {
    return { success: false, error: `Proof can only be sent within ${EVIDENCE_WINDOW_DAYS} days of the decline.` }
  }

  // One open claim per request. A draft can be reopened.
  const { data: open } = await admin
    .from('job_evidence_claims')
    .select('*')
    .eq('invite_kind', req.kind)
    .eq('invite_id', req.id)
    .in('status', ['draft', 'awaiting_response', 'under_review'])
    .maybeSingle()
  const existing = open as unknown as JobEvidenceClaim | null
  if (existing && existing.status !== 'draft') return { success: false, error: 'Proof has already been sent for this request.' }

  // No more than 3 claims in any 30 days
  const since = addDays(new Date(), -30).toISOString()
  const { count } = await admin
    .from('job_evidence_claims')
    .select('id', { count: 'exact', head: true })
    .eq('requester_id', userId)
    .neq('status', 'draft')
    .gte('created_at', since)
  if ((count ?? 0) >= MAX_CLAIMS_PER_30_DAYS) {
    return { success: false, error: `You can send proof for up to ${MAX_CLAIMS_PER_30_DAYS} requests in 30 days.` }
  }

  if (existing) {
    await admin.from('job_evidence_claims').update({ requester_statement: text }).eq('id', existing.id)
    return { success: true, claimId: existing.id }
  }

  const { data: created, error } = await admin
    .from('job_evidence_claims')
    .insert({
      invite_kind: req.kind,
      invite_id: req.id,
      requester_id: userId,
      respondent_id: req.respondentId,
      requester_statement: text,
      status: 'draft',
    })
    .select('id')
    .single()
  if (error || !created) return { success: false, error: 'Could not start your claim. Please try again.' }
  return { success: true, claimId: created.id as string }
}

/** Adds one file to a claim. The requester adds while it is a draft; the respondent while it awaits their response. */
export async function uploadEvidenceFile(formData: FormData): Promise<Result<{ fileId: string }>> {
  const userId = await currentUser()
  if (!userId) return { success: false, error: 'You must be signed in.' }

  const claimId = String(formData.get('claimId') ?? '')
  const evidenceType = String(formData.get('evidenceType') ?? '') as EvidenceType
  const file = formData.get('file')
  if (!claimId || !(file instanceof File)) return { success: false, error: 'No file provided.' }
  if (!EVIDENCE_TYPES.includes(evidenceType)) return { success: false, error: 'Choose what this file is.' }

  const kind = ALLOWED_EVIDENCE_MIME[file.type]
  if (!kind) return { success: false, error: 'Only photos (JPG, PNG, WebP) and PDFs are accepted.' }
  if (file.size > MAX_EVIDENCE_FILE_BYTES) return { success: false, error: 'Each file must be 4 MB or smaller.' }

  const admin = createAdminClient()
  const claim = await getClaim(admin, claimId)
  if (!claim) return { success: false, error: 'Claim not found.' }

  const isRequester = claim.requester_id === userId
  const isRespondent = claim.respondent_id === userId
  const requesterCanAdd = isRequester && claim.status === 'draft'
  const respondentCanAdd = isRespondent && claim.status === 'awaiting_response'
  if (!requesterCanAdd && !respondentCanAdd) return { success: false, error: 'Files cannot be added to this claim now.' }

  const { count } = await admin
    .from('job_evidence_files')
    .select('id', { count: 'exact', head: true })
    .eq('claim_id', claimId)
    .eq('uploaded_by', userId)
  if ((count ?? 0) >= MAX_EVIDENCE_FILES) return { success: false, error: `You can add up to ${MAX_EVIDENCE_FILES} files.` }

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${claimId}/${randomUUID()}.${ext}`
  const { error: upErr } = await admin.storage
    .from('job-evidence')
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type })
  if (upErr) return { success: false, error: 'Could not upload that file. Please try again.' }

  const { data: row, error: dbErr } = await admin
    .from('job_evidence_files')
    .insert({ claim_id: claimId, uploaded_by: userId, storage_path: storagePath, file_type: kind, evidence_type: evidenceType })
    .select('id')
    .single()
  if (dbErr || !row) {
    await admin.storage.from('job-evidence').remove([storagePath])
    return { success: false, error: 'Could not save that file. Please try again.' }
  }
  return { success: true, fileId: row.id as string }
}

/** Sends the claim to the other person. Needs at least one file. */
export async function finishEvidenceClaim(claimId: string): Promise<Result> {
  const userId = await currentUser()
  if (!userId) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const claim = await getClaim(admin, claimId)
  if (!claim || claim.requester_id !== userId) return { success: false, error: 'Claim not found.' }
  if (claim.status !== 'draft') return { success: false, error: 'This claim has already been sent.' }

  const { data: files } = await admin.from('job_evidence_files').select('evidence_type').eq('claim_id', claimId).eq('uploaded_by', userId)
  const rows = (files ?? []) as unknown as Pick<JobEvidenceFile, 'evidence_type'>[]
  if (rows.length === 0) return { success: false, error: 'Add at least one file as proof.' }

  const now = new Date()
  const responseDeadline = addDays(now, RESPONSE_DAYS)
  const types = Array.from(new Set(rows.map(r => r.evidence_type)))
  const { error } = await admin.from('job_evidence_claims').update({
    status: 'awaiting_response',
    evidence_types: types,
    response_deadline: responseDeadline.toISOString(),
    decision_deadline: addDays(now, DECISION_DAYS).toISOString(),
  }).eq('id', claimId)
  if (error) return { success: false, error: 'Could not send your proof. Please try again.' }

  const req = await loadRequest(admin, claim.invite_id)
  const { data: requester } = await admin.from('users').select('full_name').eq('id', userId).maybeSingle()
  const requesterName = (requester?.full_name as string | undefined) ?? 'Someone'
  const jobType = req?.jobType ?? 'job'

  await admin.from('notifications').insert({
    user_id: claim.respondent_id,
    type: 'job_confirmed',
    title: 'Proof of a job has been sent',
    body: `${requesterName} says the job you declined did happen and has sent evidence. You have until ${fmtDate(responseDeadline.toISOString())} to give your side.`,
    link: `/requests/${claim.invite_id}/evidence/respond`,
  })
  const { data: respondent } = await admin.from('users').select('email').eq('id', claim.respondent_id).maybeSingle()
  if (respondent?.email) {
    const r = await sendEmail(respondent.email as string, evidenceReceived({
      requesterName, jobType, deadline: fmtDate(responseDeadline.toISOString()), requestId: claim.invite_id,
    }))
    if (!r.ok) console.error('Evidence email failed (non-fatal):', r.error)
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function withdrawEvidenceClaim(claimId: string): Promise<Result> {
  const userId = await currentUser()
  if (!userId) return { success: false, error: 'You must be signed in.' }
  const admin = createAdminClient()
  const claim = await getClaim(admin, claimId)
  if (!claim || claim.requester_id !== userId) return { success: false, error: 'Claim not found.' }
  if (claim.status !== 'draft' && claim.status !== 'awaiting_response' && claim.status !== 'under_review') {
    return { success: false, error: 'This claim is already closed.' }
  }
  await admin.from('job_evidence_claims').update({ status: 'withdrawn', decided_at: new Date().toISOString() }).eq('id', claimId)
  revalidatePath('/dashboard')
  return { success: true }
}

// ── Respondent ────────────────────────────────────────────────

/** The respondent gives their side. The claim then goes to the admin queue straight away. */
export async function respondToEvidenceClaim(claimId: string, statement: string): Promise<Result> {
  const userId = await currentUser()
  if (!userId) return { success: false, error: 'You must be signed in.' }
  const text = statement.trim()
  if (text.length < 5) return { success: false, error: 'Please tell us your side.' }
  if (text.length > STATEMENT_MAX) return { success: false, error: `Please keep it to ${STATEMENT_MAX} characters.` }

  const admin = createAdminClient()
  const claim = await getClaim(admin, claimId)
  if (!claim || claim.respondent_id !== userId) return { success: false, error: 'Claim not found.' }
  if (claim.status !== 'awaiting_response') return { success: false, error: 'This claim is not waiting for your response.' }
  if (claim.response_deadline && new Date(claim.response_deadline) < new Date()) {
    return { success: false, error: 'The time to respond has passed.' }
  }

  const { error } = await admin.from('job_evidence_claims').update({
    respondent_statement: text,
    status: 'under_review',
  }).eq('id', claimId)
  if (error) return { success: false, error: 'Could not save your response. Please try again.' }
  revalidatePath('/dashboard')
  return { success: true }
}

/** The respondent accepts the job after all. Closes the claim as confirmed with no admin decision. */
export async function confirmFromEvidenceClaim(claimId: string): Promise<Result> {
  const userId = await currentUser()
  if (!userId) return { success: false, error: 'You must be signed in.' }
  const admin = createAdminClient()
  const claim = await getClaim(admin, claimId)
  if (!claim || claim.respondent_id !== userId) return { success: false, error: 'Claim not found.' }
  if (claim.status !== 'awaiting_response' && claim.status !== 'under_review') {
    return { success: false, error: 'This claim is already closed.' }
  }
  const r = await applyUpheld(admin, claim, null, 'respondent_confirmed')
  if (!r.ok) return { success: false, error: r.error }
  revalidatePath('/dashboard')
  return { success: true }
}
