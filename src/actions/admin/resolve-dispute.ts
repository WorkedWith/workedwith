'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
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

  const outcomeLabel: Record<ResolveDisputeInput['decision'], string> = {
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

  const resend = new Resend(process.env.RESEND_API_KEY)
  const emailPromises: Promise<unknown>[] = []

  if (raiser?.email) {
    emailPromises.push(
      resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>',
        to: raiser.email,
        subject: 'Your dispute has been resolved — WorkedWith',
        html: disputeEmailHtml(raiser.full_name, label, 'raiser'),
      }).catch((emailError: unknown) => {
        console.error('Email send failed (non-fatal):', emailError)
      })
    )
  }
  if (respondent?.email) {
    emailPromises.push(
      resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>',
        to: respondent.email,
        subject: 'Dispute resolved — WorkedWith',
        html: disputeEmailHtml(respondent.full_name, label, 'respondent'),
      }).catch((emailError: unknown) => {
        console.error('Email send failed (non-fatal):', emailError)
      })
    )
  }
  await Promise.all(emailPromises)

  revalidatePath('/admin/disputes')
  revalidatePath('/admin')
  return { success: true }
}

function disputeEmailHtml(name: string, outcomeLabel: string, role: 'raiser' | 'respondent'): string {
  const body = role === 'raiser'
    ? `Following our review of the evidence, the review has been <strong>${outcomeLabel}</strong>.`
    : `A dispute was raised about a review on your profile. Following our review of the evidence, the review has been <strong>${outcomeLabel}</strong>.`

  return `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0F1F3D;padding:24px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Worked<span style="color:#F59E0B;">With</span></span>
</td></tr>
<tr><td style="padding:32px 28px;">
  <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hi ${name},</p>
  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
    We have completed our review of a recent dispute on WorkedWith.
  </p>
  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${body}</p>
  <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
    If you have any questions, please contact us at <a href="mailto:hello@workedwith.co.uk" style="color:#F59E0B;">hello@workedwith.co.uk</a>.
  </p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #F3F4F6;">
  <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">WorkedWith &bull; hello@workedwith.co.uk</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}
