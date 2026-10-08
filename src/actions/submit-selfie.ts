'use server'

import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { adminIdSubmitted, idSelfieLink } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const MAX_BYTES = 10 * 1024 * 1024
const BUCKET = 'verification-documents'
const MOBILE_UA = /iPhone|iPad|iPod|Android|Mobile/i

export type SubmitSelfieResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Step 2 of 2: a selfie holding the code, taken on a phone.
 * The page opens the front camera directly; this is a second check on the device.
 */
export async function submitSelfie(formData: FormData): Promise<SubmitSelfieResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const ua = (await headers()).get('user-agent') ?? ''
  const touchDevice = formData.get('touch') === '1'
  if (!MOBILE_UA.test(ua) && !touchDevice) {
    return { success: false, error: 'The selfie has to be taken on a phone. Open this page on your phone and try again.' }
  }

  if (formData.get('consent') !== 'yes') {
    return { success: false, error: 'Please tick the box to agree before sending your selfie.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return { success: false, error: 'Please take your selfie first.' }
  if (!ALLOWED_TYPES.has(file.type)) return { success: false, error: 'That file type is not supported. Please take the photo with your camera.' }
  if (file.size > MAX_BYTES) return { success: false, error: 'The photo is too big. Please try again.' }

  const admin = createAdminClient()

  const { data: userData } = await admin
    .from('users')
    .select('full_name, email, id_verification_status')
    .eq('id', user.id)
    .single()
  if (!userData) return { success: false, error: 'Account not found.' }
  const status = userData.id_verification_status as string
  if (status === 'pending' || status === 'approved') {
    return { success: false, error: 'Your ID is already with us.' }
  }

  const { data: doc } = await admin
    .from('verification_documents')
    .select('id')
    .eq('user_id', user.id)
    .eq('outcome', 'pending')
    .is('selfie_path', null)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!doc) return { success: false, error: 'Send your ID document first.' }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type.includes('hei') ? 'heic' : 'jpg'
  const selfiePath = `${user.id}/${doc.id}-selfie.${ext}`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(selfiePath, await file.arrayBuffer(), { contentType: file.type, upsert: true })
  if (uploadErr) return { success: false, error: 'Failed to upload your selfie. Please try again.' }

  const { error: docErr } = await admin
    .from('verification_documents')
    .update({ selfie_path: selfiePath, selfie_submitted_at: new Date().toISOString() })
    .eq('id', doc.id)
  if (docErr) {
    await admin.storage.from(BUCKET).remove([selfiePath])
    return { success: false, error: 'Failed to record your selfie. Please try again.' }
  }

  const { error: statusErr } = await admin
    .from('users')
    .update({ id_verification_status: 'pending' })
    .eq('id', user.id)
  if (statusErr) return { success: false, error: 'Failed to update your verification status. Please try again.' }

  const alert = await sendEmail(
    'hello@workedwith.co.uk',
    adminIdSubmitted({ name: userData.full_name as string, email: userData.email as string }),
  )
  if (!alert.ok) console.error('Admin notification email failed (non-fatal):', alert.error)

  return { success: true }
}

/** Emails the person a link to finish the selfie step on their phone. */
export async function sendSelfieLink(): Promise<SubmitSelfieResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('full_name, email').eq('id', user.id).single()
  if (!userData?.email) return { success: false, error: 'We could not find your email address.' }

  const firstName = ((userData.full_name as string) ?? '').trim().split(/\s+/)[0] || 'there'
  const r = await sendEmail(userData.email as string, idSelfieLink({ name: firstName }))
  if (!r.ok) return { success: false, error: 'The email could not be sent. Please try again.' }
  return { success: true }
}
