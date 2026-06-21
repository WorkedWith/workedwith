'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type DeleteFeaturedImageResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteFeaturedImage(imageId: string): Promise<DeleteFeaturedImageResult> {
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
    .from('featured_job_images')
    .select('id, storage_path, featured_job_id')
    .eq('id', imageId)
    .maybeSingle()

  if (!image) return { success: false, error: 'Image not found.' }

  // Verify ownership through the featured job
  const { data: featuredJob } = await admin
    .from('featured_jobs')
    .select('id')
    .eq('id', image.featured_job_id as string)
    .eq('trade_profile_id', tradeProfile.id as string)
    .maybeSingle()

  if (!featuredJob) return { success: false, error: 'Not authorised.' }

  await admin.storage
    .from('featured-job-images')
    .remove([image.storage_path as string])

  await admin.from('featured_job_images').delete().eq('id', imageId)

  return { success: true }
}
