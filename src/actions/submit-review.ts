'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ReviewerType, RedFlagReason } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type SubmitReviewInput = {
  job_id: string
  overall_rating: number
  // Trade → Client
  payment_score?: number
  scope_clarity_score?: number
  site_access_score?: number
  red_flag?: boolean
  red_flag_reason?: RedFlagReason
  // Client → Trade
  quality_score?: number
  reliability_score?: number
  value_score?: number
  // Shared
  communication_score?: number
  would_work_again?: boolean
  written_review?: string
}

export type SubmitReviewResult =
  | { success: true; bothSubmitted: boolean }
  | { success: false; error: string; field?: string }

// ── Helpers ───────────────────────────────────────────────────

function avg(vals: (number | null | undefined)[]): number {
  const nums = vals.filter((v): v is number => typeof v === 'number')
  if (nums.length === 0) return 0
  return nums.reduce((s, v) => s + v, 0) / nums.length
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
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

function waitingHtml(p: { revieweeName: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Review saved</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Your review for <strong>${p.revieweeName}</strong> is saved. We&apos;ll notify you as soon as they submit theirs, and both reviews will go live together.
    </p>
    ${cta('View job', p.jobUrl)}
  `)
}

function nudgeHtml(p: { reviewerName: string; jobUrl: string; windowCloses: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Don&apos;t forget</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.reviewerName}</strong> has reviewed your job on WorkedWith. Leave yours before the window closes on <strong>${new Date(p.windowCloses).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
    </p>
    ${cta('Leave your review now', p.jobUrl)}
  `)
}

function publishedHtml(p: { otherPartyName: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Your reviews are live</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Both reviews have been submitted and are now live on WorkedWith. See what <strong>${p.otherPartyName}</strong> said about you.
    </p>
    ${cta('View reviews', p.jobUrl)}
  `)
}

function publishedAloneReviewerHtml(p: { revieweeName: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Your review is now live</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Your review of <strong>${p.revieweeName}</strong> is now live on their WorkedWith profile.
      ${p.revieweeName} did not submit their review within the 7&#8209;day window.
    </p>
    ${cta('View job', p.jobUrl)}
  `)
}

function missedWindowHtml(p: { reviewerName: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">You missed your review window</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${p.reviewerName}</strong> reviewed your job. You had 7 days to submit yours.
      Your window has now closed and their review is live on your profile.
      You can no longer submit a review for this job.
    </p>
    ${cta('View job', p.jobUrl)}
  `)
}

// ── Action ────────────────────────────────────────────────────

export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData || !userData.phone_verified) {
    return { success: false, error: 'Phone verification is required to submit reviews.' }
  }

  // Validate rating
  if (!input.overall_rating || input.overall_rating < 1 || input.overall_rating > 5) {
    return { success: false, error: 'Please select an overall rating.', field: 'overall_rating' }
  }

  // Validate optional scores
  const optionalScores = [
    'payment_score', 'scope_clarity_score', 'site_access_score',
    'quality_score', 'reliability_score', 'value_score', 'communication_score',
  ] as const
  for (const field of optionalScores) {
    const val = input[field]
    if (val !== undefined && (val < 1 || val > 5)) {
      return { success: false, error: 'Scores must be between 1 and 5.', field }
    }
  }

  // Red flag requires a reason
  if (input.red_flag && !input.red_flag_reason) {
    return { success: false, error: 'Please select a reason for the red flag.', field: 'red_flag_reason' }
  }

  const writtenReview = input.written_review?.trim() ?? null
  if (writtenReview && writtenReview.length > 500) {
    return { success: false, error: 'Written review must be 500 characters or fewer.', field: 'written_review' }
  }

  // Fetch job
  const { data: job } = await admin.from('jobs').select('*').eq('id', input.job_id).maybeSingle()
  if (!job) return { success: false, error: 'Job not found.' }
  if (job.status !== 'completed') return { success: false, error: 'Reviews can only be submitted for completed jobs.' }

  // Fetch review window
  const { data: reviewWindow } = await admin
    .from('review_windows')
    .select('*')
    .eq('job_id', input.job_id)
    .maybeSingle()

  if (!reviewWindow) return { success: false, error: 'No review window found for this job.' }

  if (reviewWindow.window_closes_at && new Date(reviewWindow.window_closes_at) < new Date()) {
    return { success: false, error: 'The review window has closed for this job.' }
  }

  // Fetch both profiles to determine caller's role and gather user IDs
  const [{ data: tradeProfile }, { data: clientProfile }] = await Promise.all([
    job.trade_profile_id
      ? admin.from('trade_profiles').select('*').eq('id', job.trade_profile_id).single()
      : { data: null },
    job.client_profile_id
      ? admin.from('client_profiles').select('*').eq('id', job.client_profile_id).single()
      : { data: null },
  ])

  const tradeUserId = tradeProfile?.user_id ?? null
  const clientUserId = clientProfile?.user_id ?? null

  let reviewerType: ReviewerType | null = null
  if (tradeUserId === user.id) reviewerType = 'trade'
  else if (clientUserId === user.id) reviewerType = 'client'

  if (!reviewerType) return { success: false, error: 'You are not a party to this job.' }

  const revieweeType: ReviewerType = reviewerType === 'trade' ? 'client' : 'trade'
  const revieweeUserId = reviewerType === 'trade' ? clientUserId : tradeUserId

  if (!revieweeUserId) return { success: false, error: 'Could not identify the other party on this job.' }

  // Duplicate check
  const { data: existing } = await admin
    .from('reviews')
    .select('id')
    .eq('job_id', input.job_id)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  if (existing) return { success: false, error: 'You have already submitted a review for this job.' }

  // Fetch both users for names and emails
  const [{ data: tradeUser }, { data: clientUser }] = await Promise.all([
    tradeUserId ? admin.from('users').select('*').eq('id', tradeUserId).single() : { data: null },
    clientUserId ? admin.from('users').select('*').eq('id', clientUserId).single() : { data: null },
  ])

  const tradeName = tradeProfile?.company_name ?? tradeUser?.full_name ?? 'the tradesperson'
  const clientName = clientProfile?.display_name ?? clientUser?.full_name ?? 'the client'

  const reviewerName = reviewerType === 'trade' ? tradeName : clientName
  const revieweeName = reviewerType === 'trade' ? clientName : tradeName

  // Insert review
  const { error: insertErr } = await admin.from('reviews').insert({
    job_id: input.job_id,
    reviewer_id: user.id,
    reviewee_id: revieweeUserId,
    reviewer_type: reviewerType,
    reviewee_type: revieweeType,
    overall_rating: input.overall_rating,
    payment_score: input.payment_score,
    communication_score: input.communication_score,
    scope_clarity_score: input.scope_clarity_score,
    site_access_score: input.site_access_score,
    quality_score: input.quality_score,
    reliability_score: input.reliability_score,
    value_score: input.value_score,
    would_work_again: input.would_work_again,
    red_flag: input.red_flag ?? false,
    red_flag_reason: input.red_flag ? input.red_flag_reason : null,
    written_review: writtenReview,
    is_backdated: job.is_backdated,
    is_visible: false,
  })

  if (insertErr) {
    return { success: false, error: 'Failed to submit review. Please try again.' }
  }

  await checkVelocitySpike(admin, input.job_id, tradeUserId)

  // Mark submitter's side on review window
  const windowUpdate =
    reviewerType === 'trade'
      ? { trade_review_submitted: true }
      : { client_review_submitted: true }

  await admin.from('review_windows').update(windowUpdate).eq('job_id', input.job_id)

  // Re-fetch window to check if both submitted
  const { data: updatedWindow } = await admin
    .from('review_windows')
    .select('*')
    .eq('job_id', input.job_id)
    .single()

  const bothSubmitted =
    (updatedWindow?.trade_review_submitted ?? false) &&
    (updatedWindow?.client_review_submitted ?? false)

  const blindWindowClosed =
    updatedWindow?.blind_window_closes_at
      ? new Date(updatedWindow.blind_window_closes_at) <= new Date()
      : false

  const resend = new Resend(process.env.RESEND_API_KEY)
  const jobUrl = `https://workedwith.co.uk/jobs/${input.job_id}`
  const reviewUrl = `https://workedwith.co.uk/jobs/${input.job_id}/review`
  const now = new Date().toISOString()

  // ── Blind window still open — hold all reviews ────────────────
  if (!blindWindowClosed) {
    const holdPromises: PromiseLike<unknown>[] = []

    holdPromises.push(
      admin.from('notifications').insert({
        user_id: user.id,
        type: 'new_review',
        title: 'Review saved',
        body: `Your review for ${revieweeName} is saved. It will be published after the 7-day window closes.`,
        link: `/jobs/${input.job_id}`,
      })
    )
    holdPromises.push(
      resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>',
        to: userData.email,
        subject: `Your review for ${revieweeName} is saved`,
        html: waitingHtml({ revieweeName, jobUrl }),
      }).catch((emailError: unknown) => {
        console.error('Email send failed (non-fatal):', emailError)
      })
    )

    // Nudge the non-submitter only if they haven't submitted yet
    if (!bothSubmitted) {
      const nonSubmitterUserId = reviewerType === 'trade' ? clientUserId : tradeUserId
      const nonSubmitterEmail = reviewerType === 'trade' ? clientUser?.email : tradeUser?.email
      const windowCloses = updatedWindow?.window_closes_at ?? null

      if (nonSubmitterUserId) {
        holdPromises.push(
          admin.from('notifications').insert({
            user_id: nonSubmitterUserId,
            type: 'review_reminder',
            title: "Don't forget — leave your review",
            body: `${reviewerName} has reviewed your ${job.job_type} job. Leave yours before the window closes.`,
            link: reviewUrl,
          })
        )
      }
      if (nonSubmitterEmail && windowCloses) {
        holdPromises.push(
          resend.emails.send({
            from: 'WorkedWith <hello@workedwith.co.uk>',
            to: nonSubmitterEmail,
            subject: `Don't forget — ${reviewerName} has reviewed your job`,
            html: nudgeHtml({ reviewerName, jobUrl: reviewUrl, windowCloses }),
          }).catch((emailError: unknown) => {
            console.error('Email send failed (non-fatal):', emailError)
          })
        )
      }
    }

    await Promise.all(holdPromises)
    return { success: true, bothSubmitted: false }
  }

  // ── Blind window closed — publish immediately ─────────────────

  if (bothSubmitted) {
    // Both submitted: publish both together
    await Promise.all([
      admin.from('review_windows').update({ both_submitted_at: now }).eq('job_id', input.job_id),
      admin.from('reviews').update({ is_visible: true }).eq('job_id', input.job_id),
    ])

    if (tradeUserId) {
      const { data: tradeReviews } = await admin
        .from('reviews').select('*')
        .eq('reviewee_id', tradeUserId).eq('reviewee_type', 'trade').eq('is_visible', true)
      if (tradeReviews && tradeReviews.length > 0) {
        await admin.from('trade_profiles').update({
          average_rating: round1(avg(tradeReviews.map(r => r.overall_rating))),
          total_reviews: tradeReviews.length,
        }).eq('user_id', tradeUserId)
      }
    }

    if (clientUserId) {
      const { data: clientReviews } = await admin
        .from('reviews').select('*')
        .eq('reviewee_id', clientUserId).eq('reviewee_type', 'client').eq('is_visible', true)
      if (clientReviews && clientReviews.length > 0) {
        const redFlagCount = clientReviews.filter(r => r.red_flag).length
        await admin.from('client_profiles').update({
          average_rating: round1(avg(clientReviews.map(r => r.overall_rating))),
          total_reviews: clientReviews.length,
          payment_reliability_score: round1(avg(clientReviews.map(r => r.payment_score))),
          communication_score: round1(avg(clientReviews.map(r => r.communication_score))),
          scope_clarity_score: round1(avg(clientReviews.map(r => r.scope_clarity_score))),
          red_flag_count: redFlagCount,
        }).eq('user_id', clientUserId)
      }
    }

    const publishedPromises: PromiseLike<unknown>[] = []
    if (tradeUserId) {
      publishedPromises.push(admin.from('notifications').insert({
        user_id: tradeUserId, type: 'reviews_published',
        title: 'Your reviews are now live',
        body: `Both reviews for your ${job.job_type} job are published. See what ${clientName} said.`,
        link: `/jobs/${input.job_id}`,
      }))
    }
    if (tradeUser?.email) {
      publishedPromises.push(resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>', to: tradeUser.email,
        subject: `Your WorkedWith reviews are now live — see what ${clientName} said about you`,
        html: publishedHtml({ otherPartyName: clientName, jobUrl }),
      }).catch((emailError: unknown) => {
        console.error('Email send failed (non-fatal):', emailError)
      }))
    }
    if (clientUserId) {
      publishedPromises.push(admin.from('notifications').insert({
        user_id: clientUserId, type: 'reviews_published',
        title: 'Your reviews are now live',
        body: `Both reviews for your ${job.job_type} job are published. See what ${tradeName} said.`,
        link: `/jobs/${input.job_id}`,
      }))
    }
    if (clientUser?.email) {
      publishedPromises.push(resend.emails.send({
        from: 'WorkedWith <hello@workedwith.co.uk>', to: clientUser.email,
        subject: `Your WorkedWith reviews are now live — see what ${tradeName} said about you`,
        html: publishedHtml({ otherPartyName: tradeName, jobUrl }),
      }).catch((emailError: unknown) => {
        console.error('Email send failed (non-fatal):', emailError)
      }))
    }
    await Promise.all(publishedPromises)
    return { success: true, bothSubmitted: true }
  }

  // Only this review submitted past the blind window — publish alone
  const nonSubmitterUserId = reviewerType === 'trade' ? clientUserId : tradeUserId
  const nonSubmitterEmail = reviewerType === 'trade' ? clientUser?.email : tradeUser?.email

  await Promise.all([
    admin.from('review_windows').update({ both_submitted_at: now }).eq('job_id', input.job_id),
    admin.from('reviews').update({ is_visible: true })
      .eq('job_id', input.job_id).eq('reviewer_id', user.id),
  ])

  // Recalculate reviewee's profile scores
  if (revieweeType === 'trade') {
    const { data: tradeReviews } = await admin
      .from('reviews').select('*')
      .eq('reviewee_id', revieweeUserId).eq('reviewee_type', 'trade').eq('is_visible', true)
    if (tradeReviews && tradeReviews.length > 0) {
      await admin.from('trade_profiles').update({
        average_rating: round1(avg(tradeReviews.map(r => r.overall_rating))),
        total_reviews: tradeReviews.length,
      }).eq('user_id', revieweeUserId)
    }
  } else {
    const { data: clientReviews } = await admin
      .from('reviews').select('*')
      .eq('reviewee_id', revieweeUserId).eq('reviewee_type', 'client').eq('is_visible', true)
    if (clientReviews && clientReviews.length > 0) {
      const redFlagCount = clientReviews.filter(r => r.red_flag).length
      await admin.from('client_profiles').update({
        average_rating: round1(avg(clientReviews.map(r => r.overall_rating))),
        total_reviews: clientReviews.length,
        payment_reliability_score: round1(avg(clientReviews.map(r => r.payment_score))),
        communication_score: round1(avg(clientReviews.map(r => r.communication_score))),
        scope_clarity_score: round1(avg(clientReviews.map(r => r.scope_clarity_score))),
        red_flag_count: redFlagCount,
      }).eq('user_id', revieweeUserId)
    }
  }

  const singlePromises: PromiseLike<unknown>[] = []

  singlePromises.push(admin.from('notifications').insert({
    user_id: user.id, type: 'reviews_published',
    title: 'Your review is now live',
    body: `Your review of ${revieweeName} is live. They did not submit their review within the 7-day window.`,
    link: `/jobs/${input.job_id}`,
  }))
  singlePromises.push(resend.emails.send({
    from: 'WorkedWith <hello@workedwith.co.uk>', to: userData.email,
    subject: 'Your review is now live on WorkedWith',
    html: publishedAloneReviewerHtml({ revieweeName, jobUrl }),
  }).catch((emailError: unknown) => {
    console.error('Email send failed (non-fatal):', emailError)
  }))

  if (nonSubmitterUserId) {
    singlePromises.push(admin.from('notifications').insert({
      user_id: nonSubmitterUserId, type: 'reviews_published',
      title: 'You missed your review window',
      body: `${reviewerName}'s review of your ${job.job_type} job is now live. Your window to review them has closed.`,
      link: `/jobs/${input.job_id}`,
    }))
  }
  if (nonSubmitterEmail) {
    singlePromises.push(resend.emails.send({
      from: 'WorkedWith <hello@workedwith.co.uk>', to: nonSubmitterEmail,
      subject: `You missed your review window — ${reviewerName}'s review of you is now live`,
      html: missedWindowHtml({ reviewerName: reviewerName, jobUrl }),
    }).catch((emailError: unknown) => {
      console.error('Email send failed (non-fatal):', emailError)
    }))
  }

  await Promise.all(singlePromises)
  return { success: true, bothSubmitted: false }
}

// ── Velocity spike check ──────────────────────────────────────

async function checkVelocitySpike(admin: ReturnType<typeof createAdminClient>, jobId: string, tradeUserId: string | null) {
  if (!tradeUserId) return

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentReviews } = await admin
    .from('reviews')
    .select('id')
    .eq('reviewee_id', tradeUserId)
    .eq('reviewee_type', 'trade')
    .gte('submitted_at', sevenDaysAgo)

  if ((recentReviews?.length ?? 0) > 5) {
    const spikeFlag = {
      job_id: jobId,
      flag_type: 'velocity_spike' as const,
      details: `Tradesperson received ${recentReviews!.length} reviews in the last 7 days`,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await admin.from('review_integrity_flags').insert([spikeFlag] as any[])
  }
}
