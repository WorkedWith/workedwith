'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type RejectVerificationResult =
  | { success: true }
  | { success: false; error: string }

export async function rejectVerification(
  documentId: string,
  reason: string,
): Promise<RejectVerificationResult> {
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

  const trimmedReason = reason.trim()
  if (!trimmedReason) return { success: false, error: 'Rejection reason is required' }

  const { data: doc } = await admin
    .from('verification_documents')
    .select('*')
    .eq('id', documentId)
    .single()
  if (!doc) return { success: false, error: 'Document not found' }
  if (doc.outcome !== 'pending') return { success: false, error: 'Document already reviewed' }

  const now = new Date().toISOString()

  await Promise.all([
    admin
      .from('verification_documents')
      .update({
        outcome: 'rejected',
        rejection_reason: trimmedReason,
        reviewed_at: now,
        reviewed_by: user.id,
      })
      .eq('id', documentId),
    admin
      .from('users')
      .update({
        id_verification_status: 'rejected',
        id_reviewed_at: now,
        id_reviewed_by: user.id,
      })
      .eq('id', doc.user_id),
    admin.from('notifications').insert({
      user_id: doc.user_id,
      type: 'id_rejected',
      title: 'Identity verification unsuccessful',
      body: `Your ID submission was not approved. Reason: ${trimmedReason}`,
      link: '/dashboard',
    }),
  ])

  const { data: recipient } = await admin
    .from('users')
    .select('email, full_name')
    .eq('id', doc.user_id)
    .single()

  if (recipient?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'WorkedWith <hello@workedwith.co.uk>',
      to: recipient.email,
      subject: 'Your identity verification was unsuccessful — WorkedWith',
      html: rejectionEmailHtml(recipient.full_name, trimmedReason),
    })
  }

  revalidatePath('/admin/verification')
  revalidatePath('/admin')
  return { success: true }
}

function rejectionEmailHtml(name: string, reason: string): string {
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
    Unfortunately we were unable to verify your identity. Please review the reason below and resubmit with a valid document.
  </p>
  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:0;font-size:13px;color:#92400E;font-weight:500;">Reason</p>
    <p style="margin:4px 0 0;font-size:14px;color:#92400E;">${reason}</p>
  </div>
  <p style="margin:16px 0;font-size:14px;color:#6B7280;line-height:1.6;">
    If you believe this is an error or need help, please contact us at <a href="mailto:hello@workedwith.co.uk" style="color:#F59E0B;">hello@workedwith.co.uk</a>.
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
