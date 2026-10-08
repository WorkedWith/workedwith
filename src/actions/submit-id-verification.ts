'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isIdDocumentType } from '@/lib/id-hash'
import type { User } from '@/types/database'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_BYTES = 10 * 1024 * 1024
const BUCKET = 'verification-documents'

export type SubmitIdVerificationResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Step 1 of 2: the ID document. Allowed from any device.
 * It is not sent to admins until the selfie (step 2) is in.
 */
export async function submitIdVerification(formData: FormData): Promise<SubmitIdVerificationResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin
    .from('users')
    .select('phone_verified, id_verification_status')
    .eq('id', user.id)
    .single()

  if (!userData) return { success: false, error: 'Account not found.' }

  const { phone_verified, id_verification_status } =
    userData as unknown as Pick<User, 'phone_verified' | 'id_verification_status'>

  if (!phone_verified) {
    return { success: false, error: 'Phone verification is required before ID verification.' }
  }
  if (id_verification_status === 'pending') {
    return { success: false, error: 'Your ID is already under review.' }
  }
  if (id_verification_status === 'approved') {
    return { success: false, error: 'Your identity is already verified.' }
  }

  const documentType = formData.get('document_type')
  if (!isIdDocumentType(documentType)) return { success: false, error: 'Please choose which document you are sending.' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { success: false, error: 'No file provided.' }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: 'Only JPG, PNG, WebP, and PDF files are accepted.' }
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: 'File must be 10 MB or smaller.' }
  }

  // Replace any earlier incomplete attempt
  const { data: stale } = await admin
    .from('verification_documents')
    .select('id, storage_path')
    .eq('user_id', user.id)
    .eq('outcome', 'pending')
    .is('selfie_path', null)
  for (const row of (stale ?? []) as unknown as { id: string; storage_path: string }[]) {
    await admin.storage.from(BUCKET).remove([row.storage_path])
    await admin.from('verification_documents').delete().eq('id', row.id)
  }

  const ext = file.type === 'application/pdf' ? 'pdf'
    : file.type === 'image/png' ? 'png'
    : file.type === 'image/webp' ? 'webp'
    : 'jpg'
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type })
  if (uploadErr) return { success: false, error: 'Failed to upload document. Please try again.' }

  const { error: docErr } = await admin.from('verification_documents').insert({
    user_id: user.id,
    storage_path: storagePath,
    document_type: documentType,
    outcome: 'pending',
  })
  if (docErr) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return { success: false, error: `Failed to record submission. Please try again. (${docErr.message})` }
  }

  return { success: true }
}
