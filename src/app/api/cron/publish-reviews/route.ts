import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ReviewWindow, Job, User, TradeProfile, ClientProfile } from '@/types/database'

// ── Score helpers ─────────────────────────────────────────────

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
  return `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0F1F3D;padding:24px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Worked<span style="color:#F59E0B;">With</span></span>
</td></tr>
<tr><td style="padding:32px 28px;">${body}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #F3F4F6;">
  <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">WorkedWith &bull; hello@workedwith.co.uk</p>
</td></tr>
</table></td></tr></table>
</body></html>`
}

function cta(label: string, href: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
  <a href="${href}" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${label}</a>
</td></tr></table>`
}

function publishedBothHtml(p: { otherName: string; jobUrl: string }): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Your reviews are live</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Both reviews are now live on WorkedWith. See what <strong>${p.otherName}</strong> said about you.
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

// ── Route ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const now = new Date()
  const nowIso = now.toISOString()

  // Find windows where blind window has closed, not yet processed, and overall window not expired
  const { data: rawWindows } = await admin
    .from('review_windows')
    .select('*')
    .lt('blind_window_closes_at', nowIso)
    .is('both_submitted_at', null)

  const windows = ((rawWindows ?? [])
    .filter(w => !w.window_closes_at || new Date(w.window_closes_at as string) > now)
  ) as unknown as ReviewWindow[]

  let processed = 0

  for (const window of windows) {
    try {
      await processWindow(window, admin, resend, nowIso)
      processed++
    } catch (err) {
      console.error(`cron: failed processing review_window ${window.id}:`, err)
    }
  }

  return NextResponse.json({ processed })
}

// ── Per-window logic ──────────────────────────────────────────

async function processWindow(
  window: ReviewWindow,
  admin: ReturnType<typeof createAdminClient>,
  resend: Resend,
  nowIso: string,
): Promise<void> {
  const { job_id, trade_review_submitted, client_review_submitted } = window

  // Mark as processed immediately to prevent double-processing if re-run
  await admin.from('review_windows').update({ both_submitted_at: nowIso }).eq('id', window.id)

  if (!trade_review_submitted && !client_review_submitted) {
    // Neither submitted — nothing to publish
    return
  }

  // Fetch job and profiles in parallel
  const { data: rawJob } = await admin.from('jobs').select('*').eq('id', job_id).single()
  if (!rawJob) return
  const job = rawJob as unknown as Job

  const [{ data: rawTrade }, { data: rawClient }] = await Promise.all([
    job.trade_profile_id
      ? admin.from('trade_profiles').select('*').eq('id', job.trade_profile_id as string).single()
      : { data: null },
    job.client_profile_id
      ? admin.from('client_profiles').select('*').eq('id', job.client_profile_id as string).single()
      : { data: null },
  ])

  const tradeProfile = rawTrade as unknown as TradeProfile | null
  const clientProfile = rawClient as unknown as ClientProfile | null
  const tradeUserId = tradeProfile?.user_id ?? null
  const clientUserId = clientProfile?.user_id ?? null

  const userIdsToFetch = [tradeUserId, clientUserId].filter((id): id is string => id !== null)
  const { data: rawUsers } = userIdsToFetch.length
    ? await admin.from('users').select('*').in('id', userIdsToFetch)
    : { data: [] }

  const users = (rawUsers ?? []) as unknown as User[]
  const tradeUser = users.find(u => u.id === tradeUserId) ?? null
  const clientUser = users.find(u => u.id === clientUserId) ?? null

  const tradeName = (tradeProfile?.company_name ?? tradeUser?.full_name) ?? 'the tradesperson'
  const clientName = (clientProfile?.display_name ?? clientUser?.full_name) ?? 'the client'
  const jobUrl = `https://workedwith.co.uk/jobs/${job_id}`

  const bothSubmitted = trade_review_submitted && client_review_submitted

  if (bothSubmitted) {
    await publishBoth({ admin, resend, job, job_id, tradeUserId, clientUserId, tradeUser, clientUser, tradeName, clientName, jobUrl, nowIso })
    return
  }

  // Single review case
  const submitterIsTrade = trade_review_submitted
  const reviewerType = submitterIsTrade ? 'trade' : 'client'
  const reviewerUserId = submitterIsTrade ? tradeUserId : clientUserId
  const reviewerUser = submitterIsTrade ? tradeUser : clientUser
  const reviewerName = submitterIsTrade ? tradeName : clientName
  const nonSubmitterUserId = submitterIsTrade ? clientUserId : tradeUserId
  const nonSubmitterEmail = submitterIsTrade ? clientUser?.email : tradeUser?.email
  const nonSubmitterName = submitterIsTrade ? clientName : tradeName
  const revieweeUserId = submitterIsTrade ? clientUserId : tradeUserId

  await admin.from('reviews')
    .update({ is_visible: true })
    .eq('job_id', job_id)
    .eq('reviewer_type', reviewerType)

  // Recalculate reviewee's profile scores
  if (revieweeUserId) {
    if (submitterIsTrade) {
      const { data: clientReviews } = await admin.from('reviews').select('*')
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
    } else {
      const { data: tradeReviews } = await admin.from('reviews').select('*')
        .eq('reviewee_id', revieweeUserId).eq('reviewee_type', 'trade').eq('is_visible', true)
      if (tradeReviews && tradeReviews.length > 0) {
        await admin.from('trade_profiles').update({
          average_rating: round1(avg(tradeReviews.map(r => r.overall_rating))),
          total_reviews: tradeReviews.length,
        }).eq('user_id', revieweeUserId)
      }
    }
  }

  const promises: PromiseLike<unknown>[] = []

  if (reviewerUserId) {
    promises.push(admin.from('notifications').insert({
      user_id: reviewerUserId, type: 'reviews_published',
      title: 'Your review is now live',
      body: `Your review of ${nonSubmitterName} is live. They did not submit their review within the 7-day window.`,
      link: `/jobs/${job_id}`,
    }))
  }
  if (reviewerUser?.email) {
    promises.push(resend.emails.send({
      from: 'WorkedWith <hello@workedwith.co.uk>', to: reviewerUser.email,
      subject: 'Your review is now live on WorkedWith',
      html: publishedAloneReviewerHtml({ revieweeName: nonSubmitterName, jobUrl }),
    }))
  }
  if (nonSubmitterUserId) {
    promises.push(admin.from('notifications').insert({
      user_id: nonSubmitterUserId, type: 'reviews_published',
      title: 'You missed your review window',
      body: `${reviewerName}'s review of your ${job.job_type} job is now live. Your window to review them has closed.`,
      link: `/jobs/${job_id}`,
    }))
  }
  if (nonSubmitterEmail) {
    promises.push(resend.emails.send({
      from: 'WorkedWith <hello@workedwith.co.uk>', to: nonSubmitterEmail,
      subject: `You missed your review window — ${reviewerName}'s review of you is now live`,
      html: missedWindowHtml({ reviewerName, jobUrl }),
    }))
  }

  await Promise.all(promises)
}

// ── Shared: publish both reviews ──────────────────────────────

async function publishBoth(p: {
  admin: ReturnType<typeof createAdminClient>
  resend: Resend
  job: Job
  job_id: string
  tradeUserId: string | null
  clientUserId: string | null
  tradeUser: User | null
  clientUser: User | null
  tradeName: string
  clientName: string
  jobUrl: string
  nowIso: string
}): Promise<void> {
  const { admin, resend, job, job_id, tradeUserId, clientUserId, tradeUser, clientUser, tradeName, clientName, jobUrl } = p

  await admin.from('reviews').update({ is_visible: true }).eq('job_id', job_id)

  if (tradeUserId) {
    const { data: tradeReviews } = await admin.from('reviews').select('*')
      .eq('reviewee_id', tradeUserId).eq('reviewee_type', 'trade').eq('is_visible', true)
    if (tradeReviews && tradeReviews.length > 0) {
      await admin.from('trade_profiles').update({
        average_rating: round1(avg(tradeReviews.map(r => r.overall_rating))),
        total_reviews: tradeReviews.length,
      }).eq('user_id', tradeUserId)
    }
  }

  if (clientUserId) {
    const { data: clientReviews } = await admin.from('reviews').select('*')
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

  const promises: PromiseLike<unknown>[] = []
  if (tradeUserId) {
    promises.push(admin.from('notifications').insert({
      user_id: tradeUserId, type: 'reviews_published',
      title: 'Your reviews are now live',
      body: `Both reviews for your ${job.job_type} job are published. See what ${clientName} said.`,
      link: `/jobs/${job_id}`,
    }))
  }
  if (tradeUser?.email) {
    promises.push(resend.emails.send({
      from: 'WorkedWith <hello@workedwith.co.uk>', to: tradeUser.email,
      subject: `Your WorkedWith reviews are now live — see what ${clientName} said about you`,
      html: publishedBothHtml({ otherName: clientName, jobUrl }),
    }))
  }
  if (clientUserId) {
    promises.push(admin.from('notifications').insert({
      user_id: clientUserId, type: 'reviews_published',
      title: 'Your reviews are now live',
      body: `Both reviews for your ${job.job_type} job are published. See what ${tradeName} said.`,
      link: `/jobs/${job_id}`,
    }))
  }
  if (clientUser?.email) {
    promises.push(resend.emails.send({
      from: 'WorkedWith <hello@workedwith.co.uk>', to: clientUser.email,
      subject: `Your WorkedWith reviews are now live — see what ${tradeName} said about you`,
      html: publishedBothHtml({ otherName: tradeName, jobUrl }),
    }))
  }
  await Promise.all(promises)
}
