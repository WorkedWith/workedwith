'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type GalleryImagePublic = {
  id: string
  storage_path: string
  caption: string | null
}

/** Approved photos for the public profile. Every trade gets a gallery (PRD 3). */
export async function getGalleryImages(tradeProfileId: string): Promise<GalleryImagePublic[]> {
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
