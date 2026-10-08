'use server'

import { sendEmail } from '@/lib/email/send'
import { adminIdSubmitted } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isIdDocumentType } from '@/lib/id-hash'
import type { User } from '@/types/database'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_BYTES = 10 * 1024 * 1024

export type SubmitIdVerificationResult =
  | { success: true }
  | { success: false; error: string }

export async function submitIdVerification(formData: FormData): Promise<SubmitIdVerificationResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin
    .from('users')
    .select('full_name, email, phone_verified, id_verification_status')
    .eq('id', user.id)
    .single()

  if (!userData) return { success: false, error: 'Account not found.' }

  const { phone_verified, id_verification_status, full_name, email } =
    userData as unknown as Pick<User, 'phone_verified' | 'id_verification_status' | 'full_name' | 'email'>

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

  const ext = file.type === 'application/pdf' ? 'pdf'
    : file.type === 'image/png' ? 'png'
    : file.type === 'image/webp' ? 'webp'
    : 'jpg'
  const docId = crypto.randomUUID()
  const storagePath = `${user.id}/${docId}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('verification-documents')
    .upload(storagePath, buffer, { contentType: file.type })

  if (uploadErr) {
    return { success: false, error: 'Failed to upload document. Please try again.' }
  }

  const { error: docErr } = await admin.from('verification_documents').insert({
    user_id: user.id,
    storage_path: storagePath,
    document_type: documentType,
    outcome: 'pending',
  })

  console.log('verification_documents insert error:', docErr ? JSON.stringify(docErr) : 'none')

  if (docErr) {
    await admin.storage.from('verification-documents').remove([storagePath])
    return { success: false, error: `Failed to record submission. Please try again. (${docErr.message})` }
  }

  const { error: statusErr } = await admin
    .from('users')
    .update({ id_verification_status: 'pending' })
    .eq('id', user.id)

  console.log('users id_verification_status update error:', statusErr ? JSON.stringify(statusErr) : 'none')

  if (statusErr) {
    return { success: false, error: `Failed to update verification status. Please try again. (${statusErr.message})` }
  }

  const alert = await sendEmail('hello@workedwith.co.uk', adminIdSubmitted({ name: full_name, email }))
  if (!alert.ok) console.error('Admin notification email failed (non-fatal):', alert.error)

  return { success: true }
}
