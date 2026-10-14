'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import { galleryLimit } from '@/lib/gallery-limits'
import { moderateImage } from '@/lib/moderation/rekognition'
import type { ModerationStatus } from '@/types/database'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024

export type UploadGalleryImageResult =
  | { success: true; imageId: string; moderationStatus: ModerationStatus }
  | { success: false; error: string }

export async function uploadGalleryImage(formData: FormData): Promise<UploadGalleryImageResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const tier = await getUserTier(user.id)
  if (!isStandardOrAbove(tier)) {
    return { success: false, error: 'Photos need a Standard or Pro plan.' }
  }

  const file = formData.get('file')
  const caption = formData.get('caption')
  if (!(file instanceof File)) return { success: false, error: 'No file provided.' }
  if (!ALLOWED_TYPES.has(file.type)) return { success: false, error: 'Only JPG, PNG and WebP images are allowed.' }
  if (file.size > MAX_BYTES) return { success: false, error: 'Images must be 10 MB or smaller.' }

  const admin = createAdminClient()
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!tradeProfile) return { success: false, error: 'Trade profile not found.' }
  const tradeProfileId = tradeProfile.id as string

  const { count } = await admin
    .from('profile_gallery_images')
    .select('id', { count: 'exact', head: true })
    .eq('trade_profile_id', tradeProfileId)
    .neq('moderation_status', 'rejected')

  const limit = galleryLimit(tier)
  if ((count ?? 0) >= limit) {
    return { success: false, error: `You have reached your limit of ${limit} gallery photos.` }
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  let moderationStatus: ModerationStatus = 'approved'
  try {
    const result = await moderateImage(bytes)
    if (!result.approved) {
      return { success: false, error: 'This image contains content we cannot accept.' }
    }
  } catch (err) {
    console.error('[Rekognition] Moderation unavailable, falling back to manual review:', err)
    moderationStatus = 'pending'
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const imageId = crypto.randomUUID()
  const storagePath = `${tradeProfileId}/gallery/${imageId}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from('featured-job-images')
    .upload(storagePath, buffer, { contentType: file.type })
  if (uploadErr) return { success: false, error: 'Could not upload the image. Please try again.' }

  const { error: dbErr } = await admin.from('profile_gallery_images').insert({
    id: imageId,
    trade_profile_id: tradeProfileId,
    storage_path: storagePath,
    caption: typeof caption === 'string' && caption.trim() ? caption.trim().slice(0, 140) : null,
    moderation_status: moderationStatus,
    display_order: count ?? 0,
  })
  if (dbErr) {
    await admin.storage.from('featured-job-images').remove([storagePath])
    return { success: false, error: 'Could not save the image. Please try again.' }
  }

  return { success: true, imageId, moderationStatus }
}
