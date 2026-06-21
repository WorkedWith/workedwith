'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import type { SubscriptionTier } from '@/types/database'

const IMAGE_LIMITS: Partial<Record<SubscriptionTier, number>> = {
  standard: 5,
  pro: 10,
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024

export type UploadFeaturedImageResult =
  | { success: true; imageId: string; storagePath: string }
  | { success: false; error: string }

export async function uploadFeaturedImage(formData: FormData): Promise<UploadFeaturedImageResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const tier = await getUserTier(user.id)
  if (!isStandardOrAbove(tier)) {
    return { success: false, error: 'Featured job images require a Standard or Pro subscription.' }
  }

  const featuredJobId = formData.get('featuredJobId')
  const file = formData.get('file')
  const caption = formData.get('caption')

  if (typeof featuredJobId !== 'string' || !featuredJobId) {
    return { success: false, error: 'Missing featured job ID.' }
  }
  if (!(file instanceof File)) {
    return { success: false, error: 'No file provided.' }
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: 'Only JPG, PNG, and WebP images are allowed.' }
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: 'Images must be 10 MB or smaller.' }
  }

  const admin = createAdminClient()

  // Verify ownership
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) return { success: false, error: 'Trade profile not found.' }

  const { data: featuredJob } = await admin
    .from('featured_jobs')
    .select('id')
    .eq('id', featuredJobId)
    .eq('trade_profile_id', tradeProfile.id as string)
    .maybeSingle()

  if (!featuredJob) return { success: false, error: 'Featured job not found or not yours.' }

  // Check per-job image limit
  const { count } = await admin
    .from('featured_job_images')
    .select('id', { count: 'exact', head: true })
    .eq('featured_job_id', featuredJobId)

  const limit = IMAGE_LIMITS[tier] ?? 5
  if ((count ?? 0) >= limit) {
    return {
      success: false,
      error: `You have reached the ${tier === 'pro' ? 'Pro' : 'Standard'} limit of ${limit} images per featured job.`,
    }
  }

  // Build storage path and upload
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const imageId = crypto.randomUUID()
  const storagePath = `${tradeProfile.id as string}/${featuredJobId}/${imageId}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('featured-job-images')
    .upload(storagePath, buffer, { contentType: file.type })

  if (uploadErr) {
    return { success: false, error: 'Failed to upload image. Please try again.' }
  }

  // Insert DB record
  const { data: imageRow, error: dbErr } = await admin
    .from('featured_job_images')
    .insert({
      featured_job_id: featuredJobId,
      storage_path: storagePath,
      caption: typeof caption === 'string' && caption.trim() ? caption.trim() : null,
      moderation_status: 'pending',
      display_order: count ?? 0,
    })
    .select('id')
    .single()

  if (dbErr || !imageRow) {
    await admin.storage.from('featured-job-images').remove([storagePath])
    return { success: false, error: 'Failed to save image. Please try again.' }
  }

  return { success: true, imageId: imageRow.id as string, storagePath }
}
