import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/app-url'
import { recordJobLinkVisit } from '@/actions/request-via-job-link'
import { jobTypeOptions } from '@/lib/job-link'
import { formatAreas } from '@/lib/format-areas'
import { JobLinkForm } from './job-link-form'

type Props = {
  params: { slug: string }
  searchParams: { state?: string; type?: string; district?: string; month?: string }
}

async function loadTrade(slug: string) {
  const admin = createAdminClient()
  const { data: tp } = await admin
    .from('trade_profiles')
    .select('id, user_id, company_name, trade_types, operating_areas, total_jobs, job_link_paused')
    .eq('public_slug', slug)
    .maybeSingle()
  if (!tp) return null
  const { data: u } = await admin.from('users').select('full_name').eq('id', tp.user_id as string).maybeSingle()
  return {
    id: tp.id as string,
    // Business name only. A personal name is used only when it is the business name.
    name: (tp.company_name as string | null) ?? (u?.full_name as string | undefined) ?? 'This business',
    tradeTypes: (tp.trade_types as string[]) ?? [],
    areas: (tp.operating_areas as string[]) ?? [],
    jobs: (tp.total_jobs as number) ?? 0,
    paused: !!tp.job_link_paused,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTrade(params.slug)
  if (!t) return { title: 'Link not found | WorkedWith', robots: { index: false } }
  const title = `Had a job done by ${t.name}? | WorkedWith`
  const description = `Log your job with ${t.name} on WorkedWith. Once they confirm, you can both leave a review.`
  const url = `${APP_URL}/t/${params.slug}/job`
  return {
    title,
    description,
    robots: { index: false },
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'WorkedWith', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function JobLinkPage({ params, searchParams }: Props) {
  const t = await loadTrade(params.slug)

  if (!t) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-navy">We could not find that business</h1>
        <p className="mt-2 text-gray-600">Check the link and try again.</p>
      </main>
    )
  }

  if (t.paused) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-navy">{t.name} isn&apos;t taking new job records right now.</h1>
        <p className="mt-2 text-gray-600">Please check back later.</p>
      </main>
    )
  }

  await recordJobLinkVisit(t.id)

  const areas = formatAreas(t.areas)
  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <div className="rounded-2xl bg-brand-navy p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-amber">WorkedWith</p>
        <h1 className="mt-2 text-2xl font-bold">Had a job done by {t.name}?</h1>
        <p className="mt-2 text-sm text-white/70">
          Log it here. Once {t.name} confirms, you can both leave a review.
        </p>
        <p className="mt-3 text-xs text-white/50">
          {t.tradeTypes.join(', ')}{areas ? ` · ${areas}` : ''}{t.jobs > 0 ? ` · ${t.jobs} job${t.jobs === 1 ? '' : 's'} confirmed` : ''}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <JobLinkForm
          slug={params.slug}
          businessName={t.name}
          jobTypes={jobTypeOptions(t.tradeTypes)}
          initial={{
            state: searchParams.state === 'in_progress' ? 'in_progress' : searchParams.state === 'finished' ? 'finished' : null,
            type: searchParams.type ?? '',
            district: searchParams.district ?? '',
            month: searchParams.month ?? '',
          }}
        />
      </div>
      <p className="mt-4 text-center text-xs text-gray-400">
        {t.name} has to confirm the job before anything is shown. Nothing is published until you have both reviewed.
      </p>
    </main>
  )
}
