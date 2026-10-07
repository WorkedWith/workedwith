'use server'

import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { jobConfirmed, pastJobConfirmed } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ─────────────────────────────────────────────────────

export type ConfirmJobResult =
  | { success: true; tradePersonName: string; isBackdated: boolean; jobId: string }
  | {
      success: false
      error: string
      code:
        | 'invalid'
        | 'expired'
        | 'already_confirmed'
        | 'no_profile'
        | 'auth_required'
        | 'unverified'
        | 'server_error'
    }

function extractOutcode(postcode: string): string {
  return postcode.trim().toUpperCase().replace(/\s+/g, '').slice(0, -3)
}

// ── Integrity checks ──────────────────────────────────────────

async function runIntegrityChecks(params: {
  admin: ReturnType<typeof createAdminClient>
  jobId: string
  jobPostcode: string | null
  loggedFromIp: string | null
  confirmedFromIp: string | null
  loggedFromUa: string | null
  confirmedFromUa: string | null
  tradeUserCreatedAt: string | null
  clientUserCreatedAt: string | null
  tradeOperatingAreas: string[]
  clientProfilePostcode: string | null
}) {
  const flags: Array<{ job_id: string; flag_type: string; details: string }> = []

  // 1. Same IP both parties
  if (params.loggedFromIp && params.confirmedFromIp && params.loggedFromIp === params.confirmedFromIp) {
    flags.push({
      job_id: params.jobId,
      flag_type: 'same_ip_both_parties',
      details: `Both parties used IP: ${params.loggedFromIp}`,
    })
  }

  // 2. Same device both parties
  if (params.loggedFromUa && params.confirmedFromUa && params.loggedFromUa === params.confirmedFromUa) {
    flags.push({
      job_id: params.jobId,
      flag_type: 'same_device_both_parties',
      details: `Both parties used the same user-agent: ${params.loggedFromUa.slice(0, 200)}`,
    })
  }

  // 3. New accounts both parties (created within 7 days of each other)
  if (params.tradeUserCreatedAt && params.clientUserCreatedAt) {
    const diff = Math.abs(
      new Date(params.tradeUserCreatedAt).getTime() - new Date(params.clientUserCreatedAt).getTime()
    )
    if (diff <= 7 * 24 * 60 * 60 * 1000) {
      flags.push({
        job_id: params.jobId,
        flag_type: 'new_accounts_both_parties',
        details: `Trade account created ${params.tradeUserCreatedAt}, client account created ${params.clientUserCreatedAt} (${(diff / 86400000).toFixed(1)} days apart)`,
      })
    }
  }

  // 4. Postcode district anomaly — job district not in trade's operating areas
  //    and not matching the client's registered postcode district
  if (params.jobPostcode) {
    const jobDistrict = extractOutcode(params.jobPostcode)
    const clientDistrict = params.clientProfilePostcode
      ? extractOutcode(params.clientProfilePostcode)
      : null

    const inTradeAreas = params.tradeOperatingAreas.includes(jobDistrict)
    const matchesClientDistrict = clientDistrict !== null && clientDistrict === jobDistrict

    if (!inTradeAreas && !matchesClientDistrict) {
      flags.push({
        job_id: params.jobId,
        flag_type: 'postcode_distance_anomaly',
        details: `Job district ${jobDistrict} is not in trade's operating areas (${params.tradeOperatingAreas.join(', ') || 'none set'}) and does not match client's district (${clientDistrict ?? 'unknown'})`,
      })
    }
  }

  if (flags.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await params.admin.from('review_integrity_flags').insert(flags as any[])
  }
}

// ── Action ────────────────────────────────────────────────────

export async function confirmJob(token: string): Promise<ConfirmJobResult> {
  if (!token?.trim()) {
    return { success: false, error: 'Invalid invitation link.', code: 'invalid' }
  }

  const h = await headers()
  const confirmed_from_ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  const confirmed_from_user_agent = h.get('user-agent') ?? null

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('job_invites')
    .select('*')
    .eq('invite_token', token.trim())
    .maybeSingle()

  if (!invite) {
    return { success: false, error: 'This invitation link is invalid or has been revoked.', code: 'invalid' }
  }

  if (invite.status !== 'pending') {
    return { success: false, error: 'This job has already been confirmed.', code: 'already_confirmed' }
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'This invitation has expired. Please ask the other party to send a new invite.', code: 'expired' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to confirm a job.', code: 'auth_required' }
  }

  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || userData.verification_tier === 'unverified') {
    return { success: false, error: 'Phone verification is required before confirming a job.', code: 'unverified' }
  }

  const { data: job } = await admin.from('jobs').select('*').eq('id', invite.job_id).single()
  if (!job) {
    return { success: false, error: 'Job not found.', code: 'invalid' }
  }

  // Determine direction: client-initiated = tradesperson is confirming
  const isClientInitiated = job.initiated_by === 'client'

  // Track both parties for post-confirm notifications and integrity checks
  let tradeProfileId = job.trade_profile_id
  let clientProfileId = job.client_profile_id
  let tradeName = 'the tradesperson'
  let tradeUserId: string | null = null
  let tradeEmail: string | null = null
  let clientName = 'the client'
  let clientUserId: string | null = null
  let clientEmail: string | null = null
  let tradeUserCreatedAt: string | null = null
  let clientUserCreatedAt: string | null = null
  let tradeOperatingAreas: string[] = []
  let clientProfilePostcode: string | null = null

  if (isClientInitiated) {
    const { data: tradeProfile } = await admin
      .from('trade_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tradeProfile) {
      return {
        success: false,
        error: 'You need a trade profile to confirm this job. Please complete your trade onboarding first.',
        code: 'no_profile',
      }
    }

    tradeProfileId = tradeProfile.id
    tradeName = tradeProfile.company_name ?? userData.full_name
    tradeUserId = user.id
    tradeEmail = userData.email
    tradeUserCreatedAt = userData.created_at
    tradeOperatingAreas = (tradeProfile.operating_areas as string[]) ?? []

    if (job.client_profile_id) {
      const { data: cp } = await admin.from('client_profiles').select('*').eq('id', job.client_profile_id).single()
      if (cp?.user_id) {
        const { data: cu } = await admin.from('users').select('*').eq('id', cp.user_id).single()
        if (cu) {
          clientUserId = cu.id
          clientEmail = cu.email
          clientName = cp.display_name ?? cu.full_name
          clientUserCreatedAt = cu.created_at
          clientProfilePostcode = cp.postcode
        }
      }
    }
  } else {
    const { data: clientProfile } = await admin
      .from('client_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientProfile) {
      return {
        success: false,
        error: 'You need a client profile to confirm a job. Please complete your client onboarding first.',
        code: 'no_profile',
      }
    }

    clientProfileId = clientProfile.id
    clientName = userData.full_name
    clientUserId = user.id
    clientEmail = userData.email
    clientUserCreatedAt = userData.created_at
    clientProfilePostcode = clientProfile.postcode

    if (job.trade_profile_id) {
      const { data: tp } = await admin.from('trade_profiles').select('*').eq('id', job.trade_profile_id).single()
      if (tp?.user_id) {
        const { data: tu } = await admin.from('users').select('*').eq('id', tp.user_id).single()
        if (tu) {
          tradeUserId = tu.id
          tradeEmail = tu.email
          tradeName = tp.company_name ?? tu.full_name
          tradeUserCreatedAt = tu.created_at
          tradeOperatingAreas = (tp.operating_areas as string[]) ?? []
        }
      }
    }
  }

  const nowDate = new Date()
  const now = nowDate.toISOString()
  const today = now.split('T')[0]
  const newStatus = job.is_backdated ? 'completed' : 'active'

  const [{ error: jobErr }] = await Promise.all([
    admin.from('jobs').update({
      status: newStatus,
      confirmed_at: now,
      updated_at: now,
      trade_profile_id: tradeProfileId,
      client_profile_id: clientProfileId,
      confirmed_from_ip,
      confirmed_from_user_agent,
      ...(job.is_backdated ? { completed_at: today } : {}),
    }).eq('id', job.id),
    admin.from('job_invites').update({
      status: 'accepted',
      responded_at: now,
    }).eq('id', invite.id),
  ])

  if (jobErr) {
    return { success: false, error: 'Failed to confirm the job. Please try again.', code: 'server_error' }
  }


  if (job.is_backdated) {
    const windowCloses = new Date(nowDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const blindWindowCloses = new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000)

    await admin.from('review_windows').insert({
      job_id: job.id,
      window_opened_at: now,
      window_closes_at: windowCloses.toISOString(),
      blind_window_closes_at: blindWindowCloses.toISOString(),
    })

    const reviewPromises: PromiseLike<unknown>[] = []

    if (tradeUserId) {
      reviewPromises.push(
        admin.from('notifications').insert({
          user_id: tradeUserId,
          type: 'review_window_opened',
          title: 'Past job confirmed: leave your review',
          body: `Your ${job.job_type} job in ${job.backdated_period ?? 'the past'} with ${clientName} has been confirmed. Reviews stay hidden until you have both submitted, or for 7 days.`,
          link: `/jobs/${job.id}`,
        })
      )
    }
    if (tradeEmail) {
      reviewPromises.push(
        sendEmail(tradeEmail, pastJobConfirmed({ otherName: clientName, jobType: job.job_type, period: job.backdated_period ?? 'the past', jobId: job.id })).then(r => {
          if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
        })
      )
    }

    if (clientUserId) {
      reviewPromises.push(
        admin.from('notifications').insert({
          user_id: clientUserId,
          type: 'review_window_opened',
          title: 'Past job confirmed: leave your review',
          body: `Your ${job.job_type} job in ${job.backdated_period ?? 'the past'} with ${tradeName} has been confirmed. Reviews stay hidden until you have both submitted, or for 7 days.`,
          link: `/jobs/${job.id}`,
        })
      )
    }
    if (clientEmail) {
      reviewPromises.push(
        sendEmail(clientEmail, pastJobConfirmed({ otherName: tradeName, jobType: job.job_type, period: job.backdated_period ?? 'the past', jobId: job.id })).then(r => {
          if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
        })
      )
    }

    await Promise.all(reviewPromises)
  } else {
    // Live job: notify trade that client has confirmed
    if (tradeUserId) {
      await Promise.all([
        admin.from('notifications').insert({
          user_id: tradeUserId,
          type: 'job_confirmed',
          title: 'Job confirmed',
          body: `${clientName} has confirmed your ${job.job_type} job.`,
          link: `/jobs/${job.id}`,
        }),
        ...(tradeEmail
          ? [sendEmail(tradeEmail, jobConfirmed({ clientName, jobType: job.job_type, postcode: job.postcode ?? '', jobId: job.id })).then(r => {
              if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
            })]
          : []),
      ])
    }
  }

  await runIntegrityChecks({
    admin,
    jobId: job.id,
    jobPostcode: job.postcode,
    loggedFromIp: job.logged_from_ip,
    confirmedFromIp: confirmed_from_ip,
    loggedFromUa: job.logged_from_user_agent,
    confirmedFromUa: confirmed_from_user_agent,
    tradeUserCreatedAt,
    clientUserCreatedAt,
    tradeOperatingAreas,
    clientProfilePostcode,
  })

  const otherPartyName = isClientInitiated ? clientName : tradeName
  return { success: true, tradePersonName: otherPartyName, isBackdated: job.is_backdated, jobId: job.id }
}
