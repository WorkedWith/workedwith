'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DisputeReason } from '@/types/database'
import { getUserTier, isProTier } from '@/lib/stripe/get-tier'

// ── Types ─────────────────────────────────────────────────────

export type RaiseDisputeResult =
  | { success: true; disputeId: string }
  | { success: false; error: string; field?: 'reason' | 'details' }

// ── Email template ────────────────────────────────────────────

function emailShell(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0F1F3D;padding:24px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Worked<span style="color:#F59E0B;">With</span></span>
</td></tr>
<tr><td style="padding:32px 28px;">${body}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #F3F4F6;">
  <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">WorkedWith &bull; hello@workedwith.co.uk</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function cta(label: string, href: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
  <a href="${href}" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${label}</a>
</td></tr></table>`
}

function disputeRaisedHtml(p: {
  raiserName: string
  evidenceDeadline: string
  evidenceUrl: string
}): string {
  const deadline = new Date(p.evidenceDeadline).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">A dispute has been raised on your review</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.raiserName}</strong> has raised a dispute on the WorkedWith review you left for them.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;">
      You have until <strong>${deadline}</strong> to submit your evidence. WorkedWith admin will then review both sides and make a decision within 21 days.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;">
      The review remains visible and is labelled &apos;Under dispute&apos; during this time.
    </p>
    ${cta('Submit your evidence', p.evidenceUrl)}
    <p style="margin:0;font-size:12px;color:#9CA3AF;">If you do not respond by the deadline, the dispute will be reviewed based on the available information.</p>
  `)
}

// ── Action ────────────────────────────────────────────────────

export async function raiseDispute(
  reviewId: string,
  reason: DisputeReason,
  details: string,
): Promise<RaiseDisputeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()

  // Validate inputs
  const trimmedDetails = details.trim()
  if (!reason) return { success: false, error: 'Please select a reason.', field: 'reason' }
  if (!trimmedDetails) return { success: false, error: 'Please provide details.', field: 'details' }
  if (trimmedDetails.length > 1000) {
    return { success: false, error: 'Details must be 1000 characters or fewer.', field: 'details' }
  }

  // Fetch review + raiser tier in parallel
  const [{ data: review }, tier] = await Promise.all([
    admin.from('reviews').select('*').eq('id', reviewId).maybeSingle(),
    getUserTier(user.id),
  ])
  if (!review) return { success: false, error: 'Review not found.' }

  // Must be the reviewee
  if ((review.reviewee_id as string) !== user.id) {
    return { success: false, error: 'You can only dispute reviews that are written about you.' }
  }

  // Review must be published
  if (!(review.is_visible as boolean)) {
    return { success: false, error: 'This review is not yet published.' }
  }

  // No existing dispute
  if ((review.dispute_status as string) !== 'none') {
    return { success: false, error: 'A dispute has already been raised for this review.' }
  }

  // 14-day window from submission
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
  if (Date.now() - new Date(review.submitted_at as string).getTime() > fourteenDaysMs) {
    return { success: false, error: 'The 14-day dispute window for this review has closed.' }
  }

  const respondentId = review.reviewer_id as string

  const isPriority = isProTier(tier)

  // Create dispute
  const { data: dispute, error: insertErr } = await admin
    .from('disputes')
    .insert({
      review_id: reviewId,
      raised_by: user.id,
      reason,
      details: trimmedDetails,
      respondent_id: respondentId,
      is_priority: isPriority,
    })
    .select('*')
    .single()

  if (insertErr || !dispute) {
    return { success: false, error: 'Failed to raise dispute. Please try again.' }
  }

  // Mark review as under dispute
  await admin.from('reviews').update({ dispute_status: 'open' }).eq('id', reviewId)

  // Gather names for notifications
  const [{ data: raiserUser }, { data: respondentUser }] = await Promise.all([
    admin.from('users').select('full_name').eq('id', user.id).single(),
    admin.from('users').select('*').eq('id', respondentId).single(),
  ])

  const raiserName = (raiserUser?.full_name as string | null | undefined) ?? 'The other party'
  const evidenceDeadline = dispute.evidence_deadline as string
  const evidenceUrl = `https://workedwith.co.uk/reviews/${reviewId}/dispute/evidence`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const tasks: PromiseLike<unknown>[] = [
    admin.from('notifications').insert({
      user_id: respondentId,
      type: 'dispute_raised',
      title: 'A dispute has been raised on your review',
      body: `${raiserName} has raised a dispute on the review you left. You have 7 days to submit your evidence.`,
      link: `/reviews/${reviewId}/dispute/evidence`,
    }),
  ]

  if (respondentUser?.email) {
    tasks.push(
      resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>',
        to: respondentUser.email as string,
        subject: 'A dispute has been raised on your WorkedWith review — you have 7 days to submit evidence',
        html: disputeRaisedHtml({ raiserName, evidenceDeadline, evidenceUrl }),
      }).catch((emailError: unknown) => {
        console.error('Email send failed (non-fatal):', emailError)
      })
    )
  }

  await Promise.all(tasks)

  return { success: true, disputeId: dispute.id as string }
}
