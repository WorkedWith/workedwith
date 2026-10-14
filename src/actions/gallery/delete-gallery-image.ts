'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type DeleteGalleryImageResult = { success: true } | { success: false; error: string }

export async function deleteGalleryImage(imageId: string): Promise<DeleteGalleryImageResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!tradeProfile) return { success: false, error: 'Trade profile not found.' }

  const { data: image } = await admin
    .from('profile_gallery_images')
    .select('id, storage_path')
    .eq('id', imageId)
    .eq('trade_profile_id', tradeProfile.id as string)
    .maybeSingle()
  if (!image) return { success: false, error: 'Photo not found.' }

  await admin.storage.from('featured-job-images').remove([image.storage_path as string])
  await admin.from('profile_gallery_images').delete().eq('id', imageId)
  return { success: true }
}
