'use server'

import { recordRequestOutcome } from '@/lib/request-outcomes'
import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { jobConfirmed, pastJobConfirmed } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jobLabel } from '@/lib/trade-types'
import { evaluateJob } from '@/lib/integrity/evaluate'
import { hashSignal } from '@/lib/integrity/hash'

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

// ── Action ────────────────────────────────────────────────────

export async function confirmJob(token: string): Promise<ConfirmJobResult> {
  if (!token?.trim()) {
    return { success: false, error: 'Invalid invitation link.', code: 'invalid' }
  }

  const h = await headers()
  // Stored as salted hashes only (PRD v3.8 item 1)
  const confirmed_from_ip = hashSignal(h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null)
  const confirmed_from_user_agent = hashSignal(h.get('user-agent') ?? null)

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

    if (job.client_profile_id) {
      const { data: cp } = await admin.from('client_profiles').select('*').eq('id', job.client_profile_id).single()
      if (cp?.user_id) {
        const { data: cu } = await admin.from('users').select('*').eq('id', cp.user_id).single()
        if (cu) {
          clientUserId = cu.id
          clientEmail = cu.email
          clientName = cp.display_name ?? cu.full_name
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

    if (job.trade_profile_id) {
      const { data: tp } = await admin.from('trade_profiles').select('*').eq('id', job.trade_profile_id).single()
      if (tp?.user_id) {
        const { data: tu } = await admin.from('users').select('*').eq('id', tp.user_id).single()
        if (tu) {
          tradeUserId = tu.id
          tradeEmail = tu.email
          tradeName = tp.company_name ?? tu.full_name
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

  // Counts towards the confirming person's confirmation rate
  await recordRequestOutcome(admin, {
    kind: 'job_invite',
    requestId: invite.id as string,
    recipientId: user.id,
    requesterId: invite.inviter_id as string,
    outcome: 'confirmed',
    requestedAt: (invite.sent_at as string | null) ?? now,
  })


  if (job.is_backdated) {
    const windowCloses = new Date(nowDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const blindWindowCloses = new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000)

    // The person who logged the past job may already have a window (their review is saved).
    // Keep their submitted flag, but start the clock from confirmation.
    const { data: existingWindow } = await admin
      .from('review_windows')
      .select('id')
      .eq('job_id', job.id)
      .maybeSingle()

    if (existingWindow) {
      await admin.from('review_windows').update({
        window_closes_at: windowCloses.toISOString(),
        blind_window_closes_at: blindWindowCloses.toISOString(),
      }).eq('job_id', job.id)
    } else {
      await admin.from('review_windows').insert({
        job_id: job.id,
        window_opened_at: now,
        window_closes_at: windowCloses.toISOString(),
        blind_window_closes_at: blindWindowCloses.toISOString(),
      })
    }

    const reviewPromises: PromiseLike<unknown>[] = []

    if (tradeUserId) {
      reviewPromises.push(
        admin.from('notifications').insert({
          user_id: tradeUserId,
          type: 'review_window_opened',
          title: 'Past job confirmed: leave your review',
          body: `Your ${jobLabel(job.job_type)} in ${job.backdated_period ?? 'the past'} with ${clientName} has been confirmed. Reviews stay hidden until you have both submitted, or for 7 days.`,
          link: `/jobs/${job.id}/review`,
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
          body: `Your ${jobLabel(job.job_type)} in ${job.backdated_period ?? 'the past'} with ${tradeName} has been confirmed. Reviews stay hidden until you have both submitted, or for 7 days.`,
          link: `/jobs/${job.id}/review`,
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
          body: `${clientName} has confirmed your ${jobLabel(job.job_type)}.`,
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

  // Score the job: a shared network flags on its own, everything else is weighed together
  await evaluateJob(admin, job.id)

  const otherPartyName = isClientInitiated ? clientName : tradeName
  return { success: true, tradePersonName: otherPartyName, isBackdated: job.is_backdated, jobId: job.id }
}
