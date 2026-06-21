import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import { FeaturedJobsClient } from './featured-jobs-client'
import type { ModerationStatus, SubscriptionTier } from '@/types/database'

export const metadata = { title: 'Featured jobs | WorkedWith' }

export type FeaturedImageOwner = {
  id: string
  storage_path: string
  caption: string | null
  display_order: number
  moderation_status: ModerationStatus
}

export type FeaturedJobOwner = {
  id: string
  title: string
  job_id: string | null
  created_at: string
  images: FeaturedImageOwner[]
}

export type CompletedJobOption = {
  id: string
  job_type: string
  postcode: string
  completed_at: string | null
}

const JOB_LIMITS: Partial<Record<SubscriptionTier, number>> = { standard: 3, pro: 5 }
const IMAGE_LIMITS: Partial<Record<SubscriptionTier, number>> = { standard: 5, pro: 10 }

export default async function FeaturedJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const tier = await getUserTier(user.id)
  if (!isStandardOrAbove(tier)) redirect('/subscription')

  const admin = createAdminClient()

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) redirect('/onboarding/trade')

  const tradeProfileId = tradeProfile.id as string

  // Fetch all featured jobs with all their images (owner sees all statuses)
  const [{ data: rawJobs }, { data: rawCompletedJobs }] = await Promise.all([
    admin
      .from('featured_jobs')
      .select('id, title, job_id, created_at')
      .eq('trade_profile_id', tradeProfileId)
      .order('created_at', { ascending: false }),
    admin
      .from('jobs')
      .select('id, job_type, postcode, completed_at')
      .eq('trade_profile_id', tradeProfileId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50),
  ])

  const jobIds = (rawJobs ?? []).map(j => j.id as string)

  const { data: rawImages } = jobIds.length > 0
    ? await admin
        .from('featured_job_images')
        .select('id, featured_job_id, storage_path, caption, display_order, moderation_status')
        .in('featured_job_id', jobIds)
        .order('display_order', { ascending: true })
    : { data: [] }

  const byJobId = new Map<string, FeaturedImageOwner[]>()
  for (const img of rawImages ?? []) {
    const jid = img.featured_job_id as string
    const bucket = byJobId.get(jid) ?? []
    bucket.push({
      id: img.id as string,
      storage_path: img.storage_path as string,
      caption: img.caption as string | null,
      display_order: img.display_order as number,
      moderation_status: img.moderation_status as ModerationStatus,
    })
    byJobId.set(jid, bucket)
  }

  const featuredJobs: FeaturedJobOwner[] = (rawJobs ?? []).map(job => ({
    id: job.id as string,
    title: job.title as string,
    job_id: job.job_id as string | null,
    created_at: job.created_at as string,
    images: byJobId.get(job.id as string) ?? [],
  }))

  const completedJobs: CompletedJobOption[] = (rawCompletedJobs ?? []).map(j => ({
    id: j.id as string,
    job_type: j.job_type as string,
    postcode: j.postcode as string,
    completed_at: j.completed_at as string | null,
  }))

  const jobLimit = JOB_LIMITS[tier] ?? 3
  const imageLimit = IMAGE_LIMITS[tier] ?? 5
  const atJobLimit = featuredJobs.length >= jobLimit

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <a href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-navy">Featured jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Showcase your best work with photos.{' '}
            {tier === 'pro'
              ? `Pro: up to ${jobLimit} featured jobs, ${imageLimit} images each.`
              : `Standard: up to ${jobLimit} featured jobs, ${imageLimit} images each.`}
          </p>
        </div>

        <FeaturedJobsClient
          featuredJobs={featuredJobs}
          completedJobs={completedJobs}
          jobLimit={jobLimit}
          imageLimit={imageLimit}
          atJobLimit={atJobLimit}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
        />
      </div>
    </main>
  )
}
