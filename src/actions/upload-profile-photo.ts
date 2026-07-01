'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

export type UploadProfilePhotoResult =
  | { success: true; url: string }
  | { success: false; error: string }

export async function uploadProfilePhoto(formData: FormData): Promise<UploadProfilePhotoResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  const file = formData.get('photo')
  if (!(file instanceof File)) return { success: false, error: 'No file provided.' }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: 'Only JPG, PNG, and WebP images are accepted.' }
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: 'Image must be 5 MB or smaller.' }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${user.id}/profile.${ext}`

  const admin = createAdminClient()
  const buffer = await file.arrayBuffer()

  const { error: uploadErr } = await admin.storage
    .from('profile-photos')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) {
    return { success: false, error: 'Failed to upload photo. Please try again.' }
  }

  const { data: urlData } = admin.storage.from('profile-photos').getPublicUrl(storagePath)
  const photoUrl = urlData.publicUrl

  const { error: dbErr } = await admin
    .from('users')
    .update({ profile_photo_url: photoUrl })
    .eq('id', user.id)

  if (dbErr) {
    return { success: false, error: 'Failed to save photo. Please try again.' }
  }

  return { success: true, url: photoUrl }
}
