'use server'

import { headers } from 'next/headers'
import { Resend } from 'resend'
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

// ── Email templates ───────────────────────────────────────────

function emailShell(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0F1F3D;padding:24px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Worked<span style="color:#F59E0B;">With</span></span>
</td></tr>
<tr><td style="padding:32px 28px;">${body}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #F3F4F6;">
  <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">WorkedWith &bull; hello@workedwith.co.uk</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function cta(label: string, href: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
  <a href="${href}" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${label}</a>
</td></tr></table>`
}

function jobConfirmedHtml(p: { clientName: string; jobType: string; postcode: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Job confirmed</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.clientName}</strong> has confirmed your <strong>${p.jobType}</strong> job at <strong>${p.postcode}</strong> on WorkedWith.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#6B7280;line-height:1.6;">
      You&apos;ll both be asked to leave a review once you mark the job as complete.
    </p>
    ${cta('View job details', p.jobUrl)}
  `)
}

function reviewRequestHtml(p: { otherPartyName: string; jobType: string; backdatedPeriod: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Leave your review now</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Your past <strong>${p.jobType}</strong> job in <strong>${p.backdatedPeriod}</strong> with <strong>${p.otherPartyName}</strong> has been confirmed on WorkedWith.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;">
      You now both have 30 days to leave your reviews. Reviews are published together once both sides are submitted.
    </p>
    ${cta('Leave your review', p.jobUrl)}
  `)
}

// ── Haversine distance in miles ───────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
  tradeProfilePostcode: string | null
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

  // 4. Postcode distance anomaly — job postcode >100 miles from both parties' postcodes
  if (params.jobPostcode) {
    const postcodesToCheck = [
      params.jobPostcode,
      params.tradeProfilePostcode,
      params.clientProfilePostcode,
    ].filter((p): p is string => Boolean(p))

    try {
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes: postcodesToCheck }),
        cache: 'no-store',
      })
      if (res.ok) {
        const data = (await res.json()) as { result: Array<{ query: string; result: { latitude: number; longitude: number } | null }> }
        const coords = new Map<string, { lat: number; lon: number }>()
        for (const item of data.result) {
          if (item.result) {
            coords.set(item.query.toUpperCase().replace(/\s+/g, ' '), {
              lat: item.result.latitude,
              lon: item.result.longitude,
            })
          }
        }
        const jobKey = params.jobPostcode.toUpperCase().replace(/\s+/g, ' ')
        const jobCoords = coords.get(jobKey)
        if (jobCoords) {
          const tradeKey = params.tradeProfilePostcode?.toUpperCase().replace(/\s+/g, ' ')
          const clientKey = params.clientProfilePostcode?.toUpperCase().replace(/\s+/g, ' ')
          const tradeCoords = tradeKey ? coords.get(tradeKey) : undefined
          const clientCoords = clientKey ? coords.get(clientKey) : undefined

          const farFromTrade = tradeCoords
            ? haversine(jobCoords.lat, jobCoords.lon, tradeCoords.lat, tradeCoords.lon) > 100
            : true
          const farFromClient = clientCoords
            ? haversine(jobCoords.lat, jobCoords.lon, clientCoords.lat, clientCoords.lon) > 100
            : true

          if (farFromTrade && farFromClient) {
            flags.push({
              job_id: params.jobId,
              flag_type: 'postcode_distance_anomaly',
              details: `Job postcode ${params.jobPostcode} is more than 100 miles from both trade postcode (${params.tradeProfilePostcode ?? 'unknown'}) and client postcode (${params.clientProfilePostcode ?? 'unknown'})`,
            })
          }
        }
      }
    } catch {
      // Network failure — skip this check
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
  let tradeProfilePostcode: string | null = null
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
    tradeProfilePostcode = tradeProfile.postcode

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
          tradeProfilePostcode = tp.postcode
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

  const resend = new Resend(process.env.RESEND_API_KEY)
  const jobUrl = `https://workedwith.co.uk/jobs/${job.id}`

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
          title: 'Past job confirmed — leave your review',
          body: `Your ${job.job_type} job in ${job.backdated_period ?? 'the past'} with ${clientName} has been confirmed.`,
          link: `/jobs/${job.id}`,
        })
      )
    }
    if (tradeEmail) {
      reviewPromises.push(
        resend.emails.send({
          from: 'WorkedWith <hello@workedwith.co.uk>',
          to: tradeEmail,
          subject: `${clientName} confirmed your past job — leave your reviews now`,
          html: reviewRequestHtml({
            otherPartyName: clientName,
            jobType: job.job_type,
            backdatedPeriod: job.backdated_period ?? '',
            jobUrl,
          }),
        }).catch((emailError: unknown) => {
          console.error('Email send failed (non-fatal):', emailError)
        })
      )
    }

    if (clientUserId) {
      reviewPromises.push(
        admin.from('notifications').insert({
          user_id: clientUserId,
          type: 'review_window_opened',
          title: 'Past job confirmed — leave your review',
          body: `Your ${job.job_type} job in ${job.backdated_period ?? 'the past'} with ${tradeName} has been confirmed.`,
          link: `/jobs/${job.id}`,
        })
      )
    }
    if (clientEmail) {
      reviewPromises.push(
        resend.emails.send({
          from: 'WorkedWith <hello@workedwith.co.uk>',
          to: clientEmail,
          subject: `${tradeName} confirmed your past job — leave your reviews now`,
          html: reviewRequestHtml({
            otherPartyName: tradeName,
            jobType: job.job_type,
            backdatedPeriod: job.backdated_period ?? '',
            jobUrl,
          }),
        }).catch((emailError: unknown) => {
          console.error('Email send failed (non-fatal):', emailError)
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
          ? [resend.emails.send({
              from: 'WorkedWith <hello@workedwith.co.uk>',
              to: tradeEmail,
              subject: `${clientName} has confirmed your job on WorkedWith`,
              html: jobConfirmedHtml({ clientName, jobType: job.job_type, postcode: job.postcode ?? '', jobUrl }),
            }).catch((emailError: unknown) => {
              console.error('Email send failed (non-fatal):', emailError)
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
    tradeProfilePostcode,
    clientProfilePostcode,
  })

  const otherPartyName = isClientInitiated ? clientName : tradeName
  return { success: true, tradePersonName: otherPartyName, isBackdated: job.is_backdated, jobId: job.id }
}
