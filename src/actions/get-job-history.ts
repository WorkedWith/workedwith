'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Job, JobStatus, Review, ReviewWindow, UserType } from '@/types/database'

export interface OtherParty {
  name: string
  public_slug: string | null
}

export interface JobReviews {
  received: Review | null
  given: Review | null
}

export interface JobHistoryItem {
  id: string
  job_type: string
  status: JobStatus
  started_at: string | null
  backdated_period: string | null
  is_backdated: boolean
  postcode: string | null
  created_at: string
  other_party: OtherParty
  my_role: 'trade' | 'client'
  reviews: JobReviews
  review_window: ReviewWindow | null
}

type JobRow = Pick<Job,
  | 'id' | 'trade_profile_id' | 'client_profile_id' | 'job_type'
  | 'status' | 'started_at' | 'backdated_period' | 'is_backdated'
  | 'postcode' | 'created_at'
>

type TradeProfileRow = { id: string; user_id: string; company_name: string | null; public_slug: string }
type ClientProfileRow = { id: string; user_id: string; display_name: string | null; company_name: string | null }
type UserRow = { id: string; full_name: string }

export async function getJobHistory(): Promise<JobHistoryItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('user_type').eq('id', user.id).single()
  if (!userData) return []

  const userType = (userData as unknown as { user_type: UserType | null }).user_type
  if (!userType) return []

  const isTrade = userType === 'trade' || userType === 'both'
  const isClient = userType === 'client_individual' || userType === 'client_business' || userType === 'both'

  const [tradeProfileResult, clientProfileResult] = await Promise.all([
    isTrade
      ? admin.from('trade_profiles').select('id').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    isClient
      ? admin.from('client_profiles').select('id').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const tpId = (tradeProfileResult.data as { id: string } | null)?.id ?? null
  const cpId = (clientProfileResult.data as { id: string } | null)?.id ?? null

  if (!tpId && !cpId) return []

  let jobsQuery = admin
    .from('jobs')
    .select('id, trade_profile_id, client_profile_id, job_type, status, started_at, backdated_period, is_backdated, postcode, created_at')

  if (tpId && cpId) {
    jobsQuery = jobsQuery.or(`trade_profile_id.eq.${tpId},client_profile_id.eq.${cpId}`)
  } else if (tpId) {
    jobsQuery = jobsQuery.eq('trade_profile_id', tpId)
  } else {
    jobsQuery = jobsQuery.eq('client_profile_id', cpId!)
  }

  const { data: rawJobs } = await jobsQuery.order('created_at', { ascending: false })
  if (!rawJobs || rawJobs.length === 0) return []

  const jobs = rawJobs as unknown as JobRow[]
  const jobIds = jobs.map(j => j.id)

  const otherTradeProfileIds = new Set<string>()
  const otherClientProfileIds = new Set<string>()

  for (const job of jobs) {
    const myRole = tpId && job.trade_profile_id === tpId ? 'trade' : 'client'
    if (myRole === 'trade' && job.client_profile_id) otherClientProfileIds.add(job.client_profile_id)
    if (myRole === 'client' && job.trade_profile_id) otherTradeProfileIds.add(job.trade_profile_id)
  }

  const [tradeProfilesResult, clientProfilesResult, reviewsResult, reviewWindowsResult] = await Promise.all([
    otherTradeProfileIds.size > 0
      ? admin.from('trade_profiles').select('id, user_id, company_name, public_slug').in('id', Array.from(otherTradeProfileIds))
      : Promise.resolve({ data: [] }),
    otherClientProfileIds.size > 0
      ? admin.from('client_profiles').select('id, user_id, display_name, company_name').in('id', Array.from(otherClientProfileIds))
      : Promise.resolve({ data: [] }),
    admin.from('reviews').select('*').in('job_id', jobIds).eq('is_visible', true),
    admin.from('review_windows').select('*').in('job_id', jobIds),
  ])

  const tradeProfiles = (tradeProfilesResult.data ?? []) as unknown as TradeProfileRow[]
  const clientProfiles = (clientProfilesResult.data ?? []) as unknown as ClientProfileRow[]

  const otherUserIds = new Set<string>()
  tradeProfiles.forEach(p => otherUserIds.add(p.user_id))
  clientProfiles.forEach(p => otherUserIds.add(p.user_id))

  const usersResult = otherUserIds.size > 0
    ? await admin.from('users').select('id, full_name').in('id', Array.from(otherUserIds))
    : { data: [] }

  const usersMap = new Map<string, string>(
    ((usersResult.data ?? []) as unknown as UserRow[]).map(u => [u.id, u.full_name])
  )
  const tradeProfilesMap = new Map(tradeProfiles.map(p => [p.id, p]))
  const clientProfilesMap = new Map(clientProfiles.map(p => [p.id, p]))

  const reviews = (reviewsResult.data ?? []) as unknown as Review[]
  const reviewWindows = (reviewWindowsResult.data ?? []) as unknown as ReviewWindow[]

  const reviewsByJob = new Map<string, Review[]>()
  for (const r of reviews) {
    const arr = reviewsByJob.get(r.job_id) ?? []
    arr.push(r)
    reviewsByJob.set(r.job_id, arr)
  }

  const windowsByJob = new Map<string, ReviewWindow>()
  for (const w of reviewWindows) windowsByJob.set(w.job_id, w)

  return jobs.map(job => {
    const myRole: 'trade' | 'client' = tpId && job.trade_profile_id === tpId ? 'trade' : 'client'

    let otherParty: OtherParty = { name: 'Unknown', public_slug: null }
    if (myRole === 'trade' && job.client_profile_id) {
      const cp = clientProfilesMap.get(job.client_profile_id)
      if (cp) {
        otherParty = {
          name: cp.display_name ?? cp.company_name ?? usersMap.get(cp.user_id) ?? 'Client',
          public_slug: null,
        }
      }
    } else if (myRole === 'client' && job.trade_profile_id) {
      const tp = tradeProfilesMap.get(job.trade_profile_id)
      if (tp) {
        otherParty = {
          name: tp.company_name ?? usersMap.get(tp.user_id) ?? 'Tradesperson',
          public_slug: tp.public_slug,
        }
      }
    }

    const jobReviews = reviewsByJob.get(job.id) ?? []
    const received = jobReviews.find(r => r.reviewee_id === user.id) ?? null
    const given = jobReviews.find(r => r.reviewer_id === user.id) ?? null

    return {
      id: job.id,
      job_type: job.job_type,
      status: job.status,
      started_at: job.started_at,
      backdated_period: job.backdated_period,
      is_backdated: job.is_backdated,
      postcode: job.postcode,
      created_at: job.created_at,
      other_party: otherParty,
      my_role: myRole,
      reviews: { received, given },
      review_window: windowsByJob.get(job.id) ?? null,
    }
  })
}
