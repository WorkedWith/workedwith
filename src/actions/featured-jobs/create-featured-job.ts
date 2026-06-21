'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import type { SubscriptionTier } from '@/types/database'

const JOB_LIMITS: Partial<Record<SubscriptionTier, number>> = {
  standard: 3,
  pro: 5,
}

export type CreateFeaturedJobInput = {
  title: string
  job_id?: string
}

export type CreateFeaturedJobResult =
  | { success: true; featuredJobId: string }
  | { success: false; error: string }

export async function createFeaturedJob(input: CreateFeaturedJobInput): Promise<CreateFeaturedJobResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const tier = await getUserTier(user.id)
  if (!isStandardOrAbove(tier)) {
    return { success: false, error: 'Featured jobs require a Standard or Pro subscription.' }
  }

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

  const { count } = await admin
    .from('featured_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('trade_profile_id', tradeProfile.id as string)

  const limit = JOB_LIMITS[tier] ?? 3
  if ((count ?? 0) >= limit) {
    return {
      success: false,
      error: `You have reached the ${tier === 'pro' ? 'Pro' : 'Standard'} limit of ${limit} featured jobs.`,
    }
  }

  const { data: featuredJob, error: insertErr } = await admin
    .from('featured_jobs')
    .insert({
      trade_profile_id: tradeProfile.id as string,
      title,
      job_id: input.job_id ?? null,
    })
    .select('id')
    .single()

  if (insertErr || !featuredJob) {
    return { success: false, error: 'Failed to create featured job. Please try again.' }
  }

  return { success: true, featuredJobId: featuredJob.id as string }
}
