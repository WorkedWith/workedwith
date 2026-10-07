'use server'

import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { idVerified } from '@/lib/email/templates'
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
    .select('email, full_name, user_type')
    .eq('id', doc.user_id)
    .single()

  if (recipient?.email) {
    const firstName = (recipient.full_name ?? '').trim().split(/\s+/)[0] || 'there'
    const isTrade = recipient.user_type === 'trade' || recipient.user_type === 'both'
    const r = await sendEmail(recipient.email, idVerified({ name: firstName, isTrade }))
    if (!r.ok) console.error('Approval email failed (non-fatal):', r.error)
  }

  revalidatePath('/admin/verification')
  revalidatePath('/admin')
  return { success: true }
}
