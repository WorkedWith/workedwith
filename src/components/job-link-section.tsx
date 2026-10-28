import { createAdminClient } from '@/lib/supabase/admin'
import { jobLinkUrl, shareMessage } from '@/lib/job-link'
import { JobLinkCard } from './job-link-card'

/** "Your job link" on the trade dashboard. Free on every plan. */
export async function JobLinkSection({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const { data: tp } = await admin
    .from('trade_profiles')
    .select('id, public_slug, company_name, job_link_paused')
    .eq('user_id', userId)
    .maybeSingle()
  if (!tp || !tp.public_slug) return null

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [{ count: visits }, { count: requests }, { data: u }] = await Promise.all([
    admin.from('job_link_events').select('id', { count: 'exact', head: true }).eq('trade_profile_id', tp.id as string).eq('kind', 'visit').gte('created_at', since),
    admin.from('job_link_events').select('id', { count: 'exact', head: true }).eq('trade_profile_id', tp.id as string).eq('kind', 'request').gte('created_at', since),
    admin.from('users').select('full_name').eq('id', userId).maybeSingle(),
  ])
  const name = (tp.company_name as string | null) ?? (u?.full_name as string | undefined) ?? 'my business'
  const url = jobLinkUrl(tp.public_slug as string)

  return (
    <JobLinkCard
      url={url}
      message={shareMessage(name, url)}
      businessName={name}
      paused={!!tp.job_link_paused}
      visits={visits ?? 0}
      requests={requests ?? 0}
    />
  )
}
