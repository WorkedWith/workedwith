'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteMatchesUser } from '@/lib/invite-match'

export type JobRequest = {
  id: string
  token: string
  fromName: string
  jobType: string
  when: string | null
  description: string | null
  isBackdated: boolean
}

type InviteRow = {
  id: string
  job_id: string
  inviter_id: string
  invitee_email: string | null
  invitee_phone: string | null
  invite_token: string | null
}
type JobRow = {
  id: string
  job_type: string
  description: string | null
  started_at: string | null
  backdated_period: string | null
  is_backdated: boolean
  status: string
}

/** Jobs that someone else has logged and invited this user to confirm. */
export async function getJobRequests(): Promise<JobRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('email, phone, phone_verified').eq('id', user.id).single()
  if (!me) return []
  const person = me as unknown as { email: string | null; phone: string | null; phone_verified: boolean }

  const filters: string[] = []
  if (person.email) filters.push(`invitee_email.ilike.${person.email.replace(/[,()]/g, '')}`)
  if (person.phone && person.phone_verified) filters.push(`invitee_phone.eq.${person.phone}`)
  if (filters.length === 0) return []

  const { data: raw } = await admin
    .from('job_invites')
    .select('id, job_id, inviter_id, invitee_email, invitee_phone, invite_token')
    .eq('status', 'pending')
    .neq('inviter_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .or(filters.join(','))
    .order('sent_at', { ascending: false })
    .limit(20)

  const invites = ((raw ?? []) as unknown as InviteRow[]).filter(
    i => i.invite_token && inviteMatchesUser({ contact_phone: i.invitee_phone, contact_email: i.invitee_email }, person),
  )
  if (invites.length === 0) return []

  const [{ data: jobs }, { data: inviters }, { data: tps }, { data: cps }] = await Promise.all([
    admin.from('jobs').select('id, job_type, description, started_at, backdated_period, is_backdated, status').in('id', invites.map(i => i.job_id)),
    admin.from('users').select('id, full_name').in('id', invites.map(i => i.inviter_id)),
    admin.from('trade_profiles').select('user_id, company_name').in('user_id', invites.map(i => i.inviter_id)),
    admin.from('client_profiles').select('user_id, display_name, company_name').in('user_id', invites.map(i => i.inviter_id)),
  ])

  const jobMap = new Map(((jobs ?? []) as unknown as JobRow[]).map(j => [j.id, j]))
  const nameOf = (id: string): string => {
    const tp = (tps ?? []).find(x => (x as { user_id: string }).user_id === id) as { company_name: string | null } | undefined
    const cp = (cps ?? []).find(x => (x as { user_id: string }).user_id === id) as { display_name: string | null; company_name: string | null } | undefined
    const u = (inviters ?? []).find(x => (x as { id: string }).id === id) as { full_name: string } | undefined
    return tp?.company_name ?? cp?.display_name ?? cp?.company_name ?? u?.full_name ?? 'Someone'
  }

  const out: JobRequest[] = []
  for (const i of invites) {
    const job = jobMap.get(i.job_id)
    if (!job || job.status !== 'pending_confirmation') continue
    out.push({
      id: i.id,
      token: i.invite_token as string,
      fromName: nameOf(i.inviter_id),
      jobType: job.job_type,
      when: job.backdated_period ?? job.started_at,
      description: job.description,
      isBackdated: job.is_backdated,
    })
  }
  return out
}
