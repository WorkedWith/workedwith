'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ModerationStatus } from '@/types/database'

export type ModerateFeaturedImageResult =
  | { success: true }
  | { success: false; error: string }

export async function moderateFeaturedImage(
  imageId: string,
  status: 'approved' | 'rejected',
): Promise<ModerateFeaturedImageResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const admin = createAdminClient()
  const { data: caller } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!caller?.is_admin) return { success: false, error: 'Admin access required.' }

  const { data: image } = await admin
    .from('featured_job_images')
    .select('id, featured_job_id, storage_path, caption')
    .eq('id', imageId)
    .maybeSingle()

  if (!image) return { success: false, error: 'Image not found.' }

  const newStatus: ModerationStatus = status
  const { error } = await admin
    .from('featured_job_images')
    .update({ moderation_status: newStatus })
    .eq('id', imageId)

  if (error) return { success: false, error: 'Failed to update moderation status.' }

  if (status === 'rejected') {
    const { data: featuredJob } = await admin
      .from('featured_jobs')
      .select('id, title, trade_profile_id')
      .eq('id', image.featured_job_id as string)
      .maybeSingle()

    if (featuredJob) {
      const { data: tradeProfile } = await admin
        .from('trade_profiles')
        .select('user_id')
        .eq('id', featuredJob.trade_profile_id as string)
        .maybeSingle()

      if (tradeProfile) {
        await admin.from('notifications').insert({
          user_id: tradeProfile.user_id as string,
          type: 'id_rejected',
          title: 'Featured image removed',
          body: `An image in your featured job "${featuredJob.title as string}" was removed by our moderation team. Please review our content guidelines and upload a replacement if needed.`,
          link: '/profile/featured-jobs',
        })
      }
    }
  }

  return { success: true }
}
