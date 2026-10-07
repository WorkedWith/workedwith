'use server'

import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { idNotVerified } from '@/lib/email/templates'
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
    const firstName = (recipient.full_name ?? '').trim().split(/\s+/)[0] || 'there'
    const r = await sendEmail(recipient.email, idNotVerified({ name: firstName, reason: trimmedReason }))
    if (!r.ok) console.error('Rejection email failed (non-fatal):', r.error)
  }

  revalidatePath('/admin/verification')
  revalidatePath('/admin')
  return { success: true }
}
