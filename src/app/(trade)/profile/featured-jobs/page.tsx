import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isProTier } from '@/lib/stripe/get-tier'
import { FEATURED_IMAGES_PER_JOB } from '@/lib/gallery-limits'
import { FeaturedJobsClient } from './featured-jobs-client'
import type { ModerationStatus } from '@/types/database'
import { BackLink } from '@/components/back-link'

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

export default async function FeaturedJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const tier = await getUserTier(user.id)
  if (!isProTier(tier)) redirect('/profile/gallery')

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

  const imageLimit = FEATURED_IMAGES_PER_JOB
  const usedJobIds = new Set(featuredJobs.map(j => j.job_id).filter((v): v is string => !!v))
  const availableJobs = completedJobs.filter(j => !usedJobIds.has(j.id))

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <BackLink href="/profile" label="Back to profile" />
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-navy">Photos from your confirmed jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pro members can add up to {imageLimit} photos to any job completed on WorkedWith. These show on your profile with a
            &ldquo;confirmed job&rdquo; tick, because the client confirmed the job happened. Want general photos of your work instead?{' '}
            <a href="/profile/gallery" className="font-semibold text-brand-navy underline">Go to your gallery</a>.
          </p>
        </div>

        <FeaturedJobsClient
          featuredJobs={featuredJobs}
          completedJobs={availableJobs}
          imageLimit={imageLimit}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
        />
      </div>
    </main>
  )
}
