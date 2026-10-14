'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { isStandardOrAbove } from '@/lib/stripe/get-tier'

export type GalleryImagePublic = {
  id: string
  storage_path: string
  caption: string | null
}

/** Approved photos for the public profile. Hidden (not deleted) while the trade is on Free. */
export async function getGalleryImages(tradeProfileId: string, tier: string | null): Promise<GalleryImagePublic[]> {
  if (!isStandardOrAbove(tier)) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('profile_gallery_images')
    .select('id, storage_path, caption')
    .eq('trade_profile_id', tradeProfileId)
    .eq('moderation_status', 'approved')
    .order('display_order', { ascending: true })
  return (data ?? []).map(r => ({
    id: r.id as string,
    storage_path: r.storage_path as string,
    caption: r.caption as string | null,
  }))
}
