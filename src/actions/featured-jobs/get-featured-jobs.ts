'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type FeaturedImagePublic = {
  id: string
  storage_path: string
  caption: string | null
  display_order: number
}

export type FeaturedJobPublic = {
  id: string
  title: string
  job_id: string | null
  created_at: string
  images: FeaturedImagePublic[]
}

export async function getFeaturedJobs(tradeProfileId: string): Promise<FeaturedJobPublic[]> {
  const admin = createAdminClient()

  const { data: rawJobs } = await admin
    .from('featured_jobs')
    .select('id, title, job_id, created_at')
    .eq('trade_profile_id', tradeProfileId)
    .order('created_at', { ascending: false })

  if (!rawJobs || rawJobs.length === 0) return []

  // Only featured jobs linked to a paid WorkedWith job are shown (PRD 15). Older ones are kept, hidden.
  const linked = rawJobs.map(j => j.job_id).filter((x): x is string => !!x)
  const { data: paid } = linked.length ? await admin.from('jobs').select('id').in('id', linked).eq('flow', 'quote').eq('status', 'paid') : { data: [] }
  const paidIds = new Set((paid ?? []).map(p => p.id as string))
  const jobs = rawJobs.filter(j => j.job_id && paidIds.has(j.job_id as string))
  if (jobs.length === 0) return []

  const jobIds = jobs.map(j => j.id as string)

  const { data: images } = await admin
    .from('featured_job_images')
    .select('id, featured_job_id, storage_path, caption, display_order')
    .in('featured_job_id', jobIds)
    .eq('moderation_status', 'approved')
    .order('display_order', { ascending: true })

  const byJobId = new Map<string, FeaturedImagePublic[]>()
  for (const img of images ?? []) {
    const jid = img.featured_job_id as string
    const bucket = byJobId.get(jid) ?? []
    bucket.push({
      id: img.id as string,
      storage_path: img.storage_path as string,
      caption: img.caption as string | null,
      display_order: img.display_order as number,
    })
    byJobId.set(jid, bucket)
  }

  return jobs.map(job => ({
    id: job.id as string,
    title: job.title as string,
    job_id: job.job_id as string | null,
    created_at: job.created_at as string,
    images: byJobId.get(job.id as string) ?? [],
  }))
}
