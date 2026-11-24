'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FEATURED_JOBS_LIMIT } from '@/lib/gallery-limits'
import { featuredTitle } from '@/lib/featured'

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

  // The trade's title is not used: the public title is generated from the job (PRD 15)
  void input.title

  const admin = createAdminClient()
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) return { success: false, error: 'Trade profile not found.' }

  // Featured jobs only come from the trade's own paid WorkedWith jobs (PRD 15, decision 1)
  const { data: job } = await admin
    .from('jobs')
    .select('id, job_type, job_address, updated_at')
    .eq('id', input.job_id)
    .eq('trade_user_id', user.id)
    .eq('flow', 'quote')
    .eq('status', 'paid')
    .maybeSingle()
  if (!job) return { success: false, error: 'Please choose one of your paid WorkedWith jobs.' }
  const { data: lastPaid } = await admin.from('payment_stages').select('paid_at').eq('job_id', job.id as string).order('paid_at', { ascending: false }).limit(1).maybeSingle()
  // Job type and month only, at most the district: never the client's name or full address
  const safeTitle = featuredTitle(job.job_type as string, (lastPaid?.paid_at as string | null) ?? (job.updated_at as string), job.job_address as string | null)

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
      title: safeTitle,
      job_id: input.job_id,
    })
    .select('id')
    .single()

  if (insertErr || !featuredJob) {
    return { success: false, error: 'Failed to create featured job. Please try again.' }
  }

  return { success: true, featuredJobId: featuredJob.id as string }
}
