'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ─────────────────────────────────────────────────────

export type SubmitEvidenceResult =
  | { success: true }
  | { success: false; error: string; field?: 'evidence' }

// ── Action ────────────────────────────────────────────────────

export async function submitDisputeEvidence(
  disputeId: string,
  evidence: string,
): Promise<SubmitEvidenceResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const trimmedEvidence = evidence.trim()
  if (!trimmedEvidence) {
    return { success: false, error: 'Please provide your evidence.', field: 'evidence' }
  }
  if (trimmedEvidence.length > 1000) {
    return { success: false, error: 'Evidence must be 1000 characters or fewer.', field: 'evidence' }
  }

  const admin = createAdminClient()
  const { data: dispute } = await admin
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .maybeSingle()

  if (!dispute) return { success: false, error: 'Dispute not found.' }

  if ((dispute.respondent_id as string) !== user.id) {
    return { success: false, error: 'You are not authorised to submit evidence for this dispute.' }
  }

  if (dispute.respondent_submitted_at) {
    return { success: false, error: 'You have already submitted evidence for this dispute.' }
  }

  if (new Date(dispute.evidence_deadline as string) < new Date()) {
    return { success: false, error: 'The evidence submission deadline has passed.' }
  }

  const now = new Date().toISOString()

  await admin.from('disputes').update({
    respondent_evidence: trimmedEvidence,
    respondent_submitted_at: now,
  }).eq('id', disputeId)

  // Notify dispute raiser
  const raiserId = dispute.raised_by as string
  const reviewId = dispute.review_id as string

  await admin.from('notifications').insert({
    user_id: raiserId,
    type: 'dispute_evidence_due',
    title: 'Dispute evidence received',
    body: 'The other party has submitted their evidence. WorkedWith admin will review and reach a decision within 14 days.',
    link: `/reviews/${reviewId}/dispute`,
  })

  return { success: true }
}
