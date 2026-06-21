'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ApproveVerificationResult =
  | { success: true }
  | { success: false; error: string }

export async function approveVerification(
  documentId: string,
): Promise<ApproveVerificationResult> {
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

  // Fetch the document and the user who submitted it
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
      .update({ outcome: 'approved', reviewed_at: now, reviewed_by: user.id })
      .eq('id', documentId),
    admin
      .from('users')
      .update({
        verification_tier: 'fully_verified',
        id_verification_status: 'approved',
        id_reviewed_at: now,
        id_reviewed_by: user.id,
      })
      .eq('id', doc.user_id),
    admin.from('notifications').insert({
      user_id: doc.user_id,
      type: 'id_verified',
      title: 'Identity verified',
      body: 'Your ID has been approved. Your profile now shows as fully verified.',
      link: '/dashboard',
    }),
    admin.storage.from('verification-documents').remove([doc.storage_path as string]),
  ])

  // Send approval email
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
      subject: 'Your identity has been verified — WorkedWith',
      html: approvalEmailHtml(recipient.full_name),
    })
  }

  revalidatePath('/admin/verification')
  revalidatePath('/admin')
  return { success: true }
}

function approvalEmailHtml(name: string): string {
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
    Great news — your identity has been verified. Your WorkedWith profile now shows a <strong>Fully Verified</strong> badge, which helps clients trust your work.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
    <a href="https://workedwith.co.uk/dashboard" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">Go to dashboard</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #F3F4F6;">
  <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">WorkedWith &bull; hello@workedwith.co.uk</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}
