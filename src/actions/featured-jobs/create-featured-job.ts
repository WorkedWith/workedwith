'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FEATURED_JOBS_LIMIT } from '@/lib/gallery-limits'

export type CreateFeaturedJobInput = {
  title: string
  job_id: string
}

export type CreateFeaturedJobResult =
  | { success: true; featuredJobId: string }
  | { success: false; error: string }

export async function createFeaturedJob(input: CreateFeaturedJobInput): Promise<CreateFeaturedJobResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const title = input.title.trim()
  if (!title) return { success: false, error: 'Please enter a title for this featured job.' }
  if (title.length > 120) return { success: false, error: 'Title must be 120 characters or fewer.' }

  const admin = createAdminClient()
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) return { success: false, error: 'Trade profile not found.' }

  // The job must be one of this trade's completed jobs, and not already featured
  const { data: job } = await admin
    .from('jobs')
    .select('id')
    .eq('id', input.job_id)
    .eq('trade_profile_id', tradeProfile.id as string)
    .eq('status', 'completed')
    .maybeSingle()
  if (!job) return { success: false, error: 'Please choose one of your completed jobs.' }

  const { data: already } = await admin
    .from('featured_jobs')
    .select('id')
    .eq('trade_profile_id', tradeProfile.id as string)
    .eq('job_id', input.job_id)
    .maybeSingle()
  if (already) return { success: false, error: 'This job already has photos. Delete the photos on that job first to start again.' }

  const { count: featuredCount } = await admin
    .from('featured_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('trade_profile_id', tradeProfile.id as string)
  if ((featuredCount ?? 0) >= FEATURED_JOBS_LIMIT) {
    return { success: false, error: `You can feature up to ${FEATURED_JOBS_LIMIT} jobs. Remove one to add another.` }
  }

  const { data: featuredJob, error: insertErr } = await admin
    .from('featured_jobs')
    .insert({
      trade_profile_id: tradeProfile.id as string,
      title,
      job_id: input.job_id,
    })
    .select('id')
    .single()

  if (insertErr || !featuredJob) {
    return { success: false, error: 'Failed to create featured job. Please try again.' }
  }

  return { success: true, featuredJobId: featuredJob.id as string }
}
