'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type DeleteFeaturedJobResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteFeaturedJob(featuredJobId: string): Promise<DeleteFeaturedJobResult> {
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

  const { data: featuredJob } = await admin
    .from('featured_jobs')
    .select('id')
    .eq('id', featuredJobId)
    .eq('trade_profile_id', tradeProfile.id as string)
    .maybeSingle()

  if (!featuredJob) return { success: false, error: 'Featured job not found or not yours.' }

  // Fetch all image paths so we can remove them from storage
  const { data: images } = await admin
    .from('featured_job_images')
    .select('storage_path')
    .eq('featured_job_id', featuredJobId)

  if (images && images.length > 0) {
    const paths = images.map(img => img.storage_path as string)
    await admin.storage.from('featured-job-images').remove(paths)
  }

  // Cascade: DB foreign key will remove images, but we delete explicitly first
  await admin.from('featured_job_images').delete().eq('featured_job_id', featuredJobId)
  await admin.from('featured_jobs').delete().eq('id', featuredJobId)

  return { success: true }
}
