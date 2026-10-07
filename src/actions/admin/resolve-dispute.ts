'use server'

import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { disputeDecidedAuthor, disputeDecidedRaiser, type DisputeOutcome } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminDecision, DisputeStatus } from '@/types/database'

export type ResolveDisputeInput = {
  disputeId: string
  decision: 'review_kept' | 'review_removed' | 'review_amended'
  adminNotes?: string
  amendedText?: string
}

export type ResolveDisputeResult =
  | { success: true }
  | { success: false; error: string }

export async function resolveDispute(
  input: ResolveDisputeInput,
): Promise<ResolveDisputeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: caller } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!caller?.is_admin) return { success: false, error: 'Forbidden' }

  if (input.decision === 'review_amended' && !input.amendedText?.trim()) {
    return { success: false, error: 'Amended review text is required' }
  }

  const { data: dispute } = await admin
    .from('disputes')
    .select('*')
    .eq('id', input.disputeId)
    .single()
  if (!dispute) return { success: false, error: 'Dispute not found' }
  if (dispute.admin_decision !== 'pending') {
    return { success: false, error: 'Dispute already resolved' }
  }

  const now = new Date().toISOString()

  const adminDecision = input.decision as AdminDecision
  const disputeStatusMap: Record<ResolveDisputeInput['decision'], DisputeStatus> = {
    review_kept: 'resolved_kept',
    review_removed: 'resolved_removed',
    review_amended: 'resolved_amended',
  }
  const disputeStatus = disputeStatusMap[input.decision]

  // Update dispute record
  await admin.from('disputes').update({
    admin_decision: adminDecision,
    admin_decision_at: now,
    admin_decision_by: user.id,
    admin_notes: input.adminNotes?.trim() || null,
    notified_at: now,
  }).eq('id', input.disputeId)

  // Update review visibility and status
  if (input.decision === 'review_removed') {
    await admin.from('reviews')
      .update({ dispute_status: disputeStatus, is_visible: false })
      .eq('id', dispute.review_id)
  } else if (input.decision === 'review_kept') {
    await admin.from('reviews')
      .update({ dispute_status: disputeStatus, is_visible: true })
      .eq('id', dispute.review_id)
  } else {
    await admin.from('reviews')
      .update({ dispute_status: disputeStatus, is_visible: true, written_review: input.amendedText!.trim() })
      .eq('id', dispute.review_id)
  }

  const outcomeLabel: Record<ResolveDisputeInput['decision'], DisputeOutcome> = {
    review_kept: 'kept as published',
    review_removed: 'removed',
    review_amended: 'amended',
  }
  const label = outcomeLabel[input.decision]

  // Notify both parties
  await Promise.all([
    admin.from('notifications').insert({
      user_id: dispute.raised_by,
      type: 'dispute_resolved',
      title: 'Your dispute has been resolved',
      body: `The review has been ${label} following our review.`,
      link: `/reviews/${dispute.review_id}/dispute`,
    }),
    admin.from('notifications').insert({
      user_id: dispute.respondent_id,
      type: 'dispute_resolved',
      title: 'Dispute resolved',
      body: `A dispute about your review has been resolved. The review has been ${label}.`,
      link: `/jobs`,
    }),
  ])

  // Email both parties
  const [{ data: raiser }, { data: respondent }] = await Promise.all([
    admin.from('users').select('email, full_name').eq('id', dispute.raised_by).single(),
    admin.from('users').select('email, full_name').eq('id', dispute.respondent_id).single(),
  ])

  const emailPromises: Promise<unknown>[] = []
  const logSend = (r: { ok: boolean; error?: string }) => {
    if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
  }
  const firstName = (full: string | null | undefined) => (full ?? '').trim().split(/\s+/)[0] || 'there'

  if (raiser?.email) {
    emailPromises.push(
      sendEmail(raiser.email, disputeDecidedRaiser({ name: firstName(raiser.full_name), outcome: label })).then(logSend)
    )
  }
  if (respondent?.email) {
    emailPromises.push(
      sendEmail(respondent.email, disputeDecidedAuthor({
        name: firstName(respondent.full_name),
        raiserName: raiser?.full_name ?? 'The other party',
        outcome: label,
      })).then(logSend)
    )
  }
  await Promise.all(emailPromises)

  revalidatePath('/admin/disputes')
  revalidatePath('/admin')
  return { success: true }
}
