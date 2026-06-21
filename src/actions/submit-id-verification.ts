'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    outcome: 'pending',
  })

  if (docErr) {
    await admin.storage.from('verification-documents').remove([storagePath])
    return { success: false, error: 'Failed to record submission. Please try again.' }
  }

  await admin.from('users').update({ id_verification_status: 'pending' }).eq('id', user.id)

  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: 'WorkedWith <hello@workedwith.co.uk>',
      to: 'hello@workedwith.co.uk',
      subject: `New ID verification submitted by ${full_name} (${email})`,
      html: `<p><strong>${full_name}</strong> (${email}) has submitted an ID document for review.</p><p>Log in to the <a href="https://workedwith.co.uk/admin/verification">admin verification queue</a> to review it.</p>`,
    })
  } catch (emailError) {
    console.error('Admin notification email failed (non-fatal):', emailError)
  }

  return { success: true }
}
