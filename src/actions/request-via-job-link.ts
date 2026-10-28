'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { jobLinkRequest, adminJobLinkBusy } from '@/lib/email/templates'
import { APP_URL } from '@/lib/app-url'
import { ALL_TRADE_TERMS } from '@/lib/trade-types'
import { jobTypeOptions, monthLabel, LINK_MAX_PER_CLIENT_PER_TRADE, LINK_MAX_PER_TRADE_PER_DAY, LINK_MIN_FORM_MS } from '@/lib/job-link'

export type JobLinkInput = {
  slug: string
  jobState: 'finished' | 'in_progress'
  jobType: string
  district: string
  month: string          // YYYY-MM
  website: string        // honeypot, must stay empty
  elapsedMs: number      // time spent on the form
}

export type JobLinkResult =
  | { success: true }
  | { success: false; error: string; needsSignIn?: boolean }

const DISTRICT_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/

export async function requestViaJobLink(input: JobLinkInput): Promise<JobLinkResult> {
  // Bot checks: a hidden field people never fill in, and a form nobody completes in under 3 seconds
  if (input.website || input.elapsedMs < LINK_MIN_FORM_MS) {
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  const district = input.district.trim().toUpperCase().replace(/\s+/g, '')
  const label = monthLabel(input.month)
  if (!DISTRICT_RE.test(district)) return { success: false, error: 'Enter the first part of the postcode, for example M20.' }
  if (!label) return { success: false, error: 'Choose the month.' }
  if (input.jobState !== 'finished' && input.jobState !== 'in_progress') return { success: false, error: 'Choose whether the job is finished.' }
  if (!(ALL_TRADE_TERMS as readonly string[]).includes(input.jobType)) return { success: false, error: 'Choose the kind of job.' }

  const monthStart = new Date(`${input.month}-01T00:00:00Z`)
  const nextMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1))
  if (monthStart >= nextMonth) return { success: false, error: 'That month is in the future.' }

  const admin = createAdminClient()
  const { data: tp } = await admin
    .from('trade_profiles')
    .select('id, user_id, company_name, trade_types, job_link_paused')
    .eq('public_slug', input.slug)
    .maybeSingle()
  if (!tp) return { success: false, error: 'We could not find that business.' }
  if (tp.job_link_paused) return { success: false, error: 'This business is not taking new job records right now.' }
  if (!jobTypeOptions(tp.trade_types as string[]).includes(input.jobType)) {
    return { success: false, error: 'Choose one of the jobs this business does.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sign in to log the job.', needsSignIn: true }
  if (user.id === tp.user_id) return { success: false, error: 'You cannot log a job with yourself.' }

  const { data: me } = await admin.from('users').select('full_name, phone_verified').eq('id', user.id).single()
  if (!me?.phone_verified) return { success: false, error: 'Verify your phone number first.', needsSignIn: true }
  const { data: cp } = await admin.from('client_profiles').select('id, display_name, company_name').eq('user_id', user.id).maybeSingle()
  if (!cp) return { success: false, error: 'You need a client account to log a job. Join as a client first.', needsSignIn: true }

  // Limits: 3 per client per trade in 30 days, 30 per trade in 24 hours
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const since24 = new Date(Date.now() - 86_400_000).toISOString()
  const [{ count: mine }, { count: today }] = await Promise.all([
    admin.from('pending_invites').select('id', { count: 'exact', head: true }).eq('source', 'trade_link').eq('target_user_id', tp.user_id as string).eq('inviting_client_id', user.id).gte('created_at', since30),
    admin.from('pending_invites').select('id', { count: 'exact', head: true }).eq('source', 'trade_link').eq('target_user_id', tp.user_id as string).gte('created_at', since24),
  ])
  if ((mine ?? 0) >= LINK_MAX_PER_CLIENT_PER_TRADE) {
    return { success: false, error: 'You have already sent this business a few requests this month. Please wait for them to respond.' }
  }
  const tradeName = (tp.company_name as string | null) ?? 'This business'
  if ((today ?? 0) >= LINK_MAX_PER_TRADE_PER_DAY) {
    const { count: told } = await admin.from('job_link_events').select('id', { count: 'exact', head: true }).eq('trade_profile_id', tp.id as string).eq('kind', 'cap_hit').gte('created_at', since24)
    if (!told) {
      await admin.from('job_link_events').insert({ trade_profile_id: tp.id as string, kind: 'cap_hit' })
      await sendEmail('hello@workedwith.co.uk', adminJobLinkBusy({ tradeName }))
    }
    return { success: false, error: 'This link is very busy right now. Please try again tomorrow.' }
  }

  // The request reaches the trade the same way any client request does
  const { data: tradeUser } = await admin.from('users').select('email, phone, phone_verified').eq('id', tp.user_id as string).single()
  const tradeEmail = (tradeUser?.email as string | null) ?? null
  const tradePhone = tradeUser?.phone_verified ? ((tradeUser?.phone as string | null) ?? null) : null
  if (!tradeEmail && !tradePhone) return { success: false, error: 'We could not send this request. Please try again later.' }

  const claimToken = randomBytes(32).toString('hex')
  const inProgress = input.jobState === 'in_progress'
  const { data: invite, error } = await admin
    .from('pending_invites')
    .insert({
      inviting_client_id: user.id,
      trade_name: tradeName,
      job_type: input.jobType,
      description: null,
      job_date: label,
      contact_email: tradeEmail,
      contact_phone: tradePhone,
      claim_token: claimToken,
      source: 'trade_link',
      job_state: input.jobState,
      job_month: `${input.month}-01`,
      postcode_district: district,
      target_user_id: tp.user_id as string,
    })
    .select('id')
    .single()
  if (error || !invite) return { success: false, error: 'Could not log the job. Please try again.' }

  await admin.from('job_link_events').insert({ trade_profile_id: tp.id as string, kind: 'request' })

  const clientName = (cp.display_name as string | null) ?? (cp.company_name as string | null) ?? (me.full_name as string)
  await admin.from('notifications').insert({
    user_id: tp.user_id as string,
    type: 'job_invite',
    title: 'A client logged a job with you',
    body: `${clientName} says you did ${inProgress ? 'a job that started' : 'a job'} in ${label}. Accept or decline it.`,
    link: `/invite/claim/${claimToken}`,
  })
  if (tradeEmail) {
    const r = await sendEmail(tradeEmail, jobLinkRequest({
      clientName, jobType: input.jobType, when: label, inProgress, claimUrl: `${APP_URL}/invite/claim/${claimToken}`,
    }))
    if (!r.ok) console.error('Job link email failed (non-fatal):', r.error)
  }
  return { success: true }
}

/** Counts a page view. No identities, just a tally for the trade. */
export async function recordJobLinkVisit(tradeProfileId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('job_link_events').insert({ trade_profile_id: tradeProfileId, kind: 'visit' })
}
