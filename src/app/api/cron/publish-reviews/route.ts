import { NextResponse } from 'next/server'
import { formatDateLong } from '@/lib/email/format'
import { sendEmail } from '@/lib/email/send'
import { bothReviewsLive, reviewReminder, theirReviewLive, yourReviewLive } from '@/lib/email/templates'
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

function logSend(r: { ok: boolean; error?: string }) {
  if (!r.ok) console.error('cron: email send failed (non-fatal):', r.error)
}

// ── Route ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
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
      await processWindow(window, admin, nowIso)
      processed++
    } catch (err) {
      console.error(`cron: failed processing review_window ${window.id}:`, err)
    }
  }

  const reminders = await sendDayFourReminders(admin, now)

  return NextResponse.json({ processed, reminders })
}

// ── Day 4 reminder ────────────────────────────────────────────

async function sendDayFourReminders(
  admin: ReturnType<typeof createAdminClient>,
  now: Date,
): Promise<number> {
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
  const { data: rawWindows } = await admin
    .from('review_windows')
    .select('*')
    .gt('blind_window_closes_at', now.toISOString())
    .lte('window_opened_at', fourDaysAgo)
    .is('reminder_4_sent_at', null)
    .is('both_submitted_at', null)

  const windows = (rawWindows ?? []) as unknown as ReviewWindow[]
  let sent = 0

  for (const w of windows) {
    try {
      // Claim the reminder first so a re-run cannot send it twice
      await admin.from('review_windows').update({ reminder_4_sent_at: now.toISOString() }).eq('id', w.id)
      if (w.trade_review_submitted && w.client_review_submitted) continue

      const { data: rawJob } = await admin.from('jobs').select('*').eq('id', w.job_id).single()
      if (!rawJob) continue
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
      const ids = [tradeProfile?.user_id, clientProfile?.user_id].filter((id): id is string => !!id)
      if (ids.length === 0) continue
      const { data: rawUsers } = await admin.from('users').select('*').in('id', ids)
      const users = (rawUsers ?? []) as unknown as User[]
      const tradeUser = users.find(u => u.id === tradeProfile?.user_id) ?? null
      const clientUser = users.find(u => u.id === clientProfile?.user_id) ?? null
      const tradeName = tradeProfile?.company_name ?? tradeUser?.full_name ?? 'the tradesperson'
      const clientName = clientProfile?.display_name ?? clientUser?.full_name ?? 'the client'

      const goesLiveOn = formatDateLong(w.blind_window_closes_at) ?? 'the end of the 7 day window'
      const daysLeft = Math.max(1, Math.ceil((new Date(w.blind_window_closes_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))

      const targets: { user: User | null; otherName: string }[] = []
      if (!w.trade_review_submitted) targets.push({ user: tradeUser, otherName: clientName })
      if (!w.client_review_submitted) targets.push({ user: clientUser, otherName: tradeName })

      for (const t of targets) {
        if (!t.user?.email) continue
        const r = await sendEmail(t.user.email, reviewReminder({
          otherName: t.otherName,
          jobType: job.job_type,
          daysLeft,
          goesLiveOn,
          jobId: w.job_id,
        }))
        logSend(r)
        if (r.ok) sent++
      }
    } catch (err) {
      console.error(`cron: day 4 reminder failed for review_window ${w.id}:`, err)
    }
  }
  return sent
}

// ── Per-window logic ──────────────────────────────────────────

async function processWindow(
  window: ReviewWindow,
  admin: ReturnType<typeof createAdminClient>,
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

  const bothSubmitted = trade_review_submitted && client_review_submitted

  if (bothSubmitted) {
    await publishBoth({ admin, job, job_id, tradeUserId, clientUserId, tradeUser, clientUser, tradeName, clientName, nowIso })
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
      body: `Your review of ${nonSubmitterName} is live. They did not submit their review within the 7 day window.`,
      link: `/jobs/${job_id}`,
    }))
  }
  if (reviewerUser?.email) {
    promises.push(sendEmail(reviewerUser.email, yourReviewLive({ otherName: nonSubmitterName, jobId: job_id })).then(logSend))
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
    promises.push(sendEmail(nonSubmitterEmail, theirReviewLive({ reviewerName, jobType: job.job_type, jobId: job_id, canReviewUntil: formatDateLong(window.window_closes_at) })).then(logSend))
  }

  await Promise.all(promises)
}

// ── Shared: publish both reviews ──────────────────────────────

async function publishBoth(p: {
  admin: ReturnType<typeof createAdminClient>
  job: Job
  job_id: string
  tradeUserId: string | null
  clientUserId: string | null
  tradeUser: User | null
  clientUser: User | null
  tradeName: string
  clientName: string
  nowIso: string
}): Promise<void> {
  const { admin, job, job_id, tradeUserId, clientUserId, tradeUser, clientUser, tradeName, clientName } = p

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
    promises.push(sendEmail(tradeUser.email, bothReviewsLive({ otherName: clientName, jobType: job.job_type, jobId: job_id })).then(logSend))
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
    promises.push(sendEmail(clientUser.email, bothReviewsLive({ otherName: tradeName, jobType: job.job_type, jobId: job_id })).then(logSend))
  }
  await Promise.all(promises)
}
