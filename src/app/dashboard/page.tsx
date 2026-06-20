import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { UserMenu } from '@/components/user-menu'
import { TRADE_TYPES } from '@/lib/trade-types'
import { getJobHistory } from '@/actions/get-job-history'
import { JobHistory } from '@/components/job-history'
import type { User, Notification } from '@/types/database'

export const metadata = { title: 'Dashboard — WorkedWith' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData) redirect('/')

  const { verification_tier, user_type, full_name, phone_verified } = userData as unknown as User
  if (verification_tier === 'unverified') redirect('/verify/phone')
  if (!user_type) redirect('/verify/phone')

  const isTrade = user_type === 'trade' || user_type === 'both'
  const isBoth = user_type === 'both'
  const isClient = isBoth || !isTrade
  const firstName = full_name.split(' ')[0]

  const [
    { data: rawNotifications },
    { data: tradeProfile },
    { data: clientProfile },
    { count: pendingJobsCount },
    jobHistory,
  ] = await Promise.all([
    admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    isTrade
      ? admin.from('trade_profiles').select('id, average_rating, total_reviews, total_jobs, public_slug, subscription_tier').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    isClient
      ? admin.from('client_profiles').select('id, average_rating, total_reviews, total_jobs').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    isTrade
      ? admin.from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .not('trade_profile_id', 'is', null)
      : admin.from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_confirmation'),
    getJobHistory(),
  ])

  const notifications = (rawNotifications ?? []) as unknown as Notification[]

  const tpId = tradeProfile ? (tradeProfile as unknown as { id: string }).id : undefined
  const cpId = clientProfile ? (clientProfile as unknown as { id: string }).id : undefined

  let hasLiveJob = false
  let hasBackdatedJobTrade = false
  let hasBackdatedJobClient = false

  if (isTrade && tpId) {
    const [{ count: liveCount }, { count: backdatedCount }] = await Promise.all([
      admin.from('jobs').select('id', { count: 'exact', head: true })
        .eq('trade_profile_id', tpId).eq('is_backdated', false),
      admin.from('jobs').select('id', { count: 'exact', head: true })
        .eq('trade_profile_id', tpId).eq('is_backdated', true),
    ])
    hasLiveJob = (liveCount ?? 0) > 0
    hasBackdatedJobTrade = (backdatedCount ?? 0) > 0
  }

  if (cpId) {
    const { count } = await admin.from('jobs').select('id', { count: 'exact', head: true })
      .eq('client_profile_id', cpId).eq('is_backdated', true)
    hasBackdatedJobClient = (count ?? 0) > 0
  }

  const hasBackdatedJob = hasBackdatedJobTrade || hasBackdatedJobClient

  const showChecklist = isTrade
    ? (!phone_verified || !tradeProfile || !hasLiveJob || !hasBackdatedJob)
    : (!phone_verified || !hasBackdatedJob)

  const tradeHasReviews = (tradeProfile?.total_reviews ?? 0) > 0
  const clientHasReviews = (clientProfile?.total_reviews ?? 0) > 0

  const hasJobs = isTrade
    ? (tradeProfile?.total_jobs ?? 0) > 0
    : (clientProfile?.total_jobs ?? 0) > 0

  const accountLabel =
    user_type === 'trade' ? 'Tradesperson' :
    user_type === 'client_individual' ? 'Client' :
    user_type === 'client_business' ? 'Business client' :
    user_type === 'both' ? 'Tradesperson & Client' : 'Account'

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-brand-navy px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="/dashboard" className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-8">

        {/* Welcome row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">
              Welcome back, {firstName}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{accountLabel} account</p>
          </div>
          {(pendingJobsCount ?? 0) > 0 && (
            <div className="shrink-0 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-center">
              <p className="text-xl font-bold text-amber-700">{pendingJobsCount}</p>
              <p className="text-xs text-amber-600">
                {isTrade
                  ? `active job${(pendingJobsCount ?? 0) !== 1 ? 's' : ''}`
                  : 'awaiting confirmation'}
              </p>
            </div>
          )}
        </div>

        {/* 'both' users — trade side label */}
        {isBoth && (
          <p className="text-xs font-bold uppercase tracking-widest text-brand-amber">As a tradesperson</p>
        )}

        {/* Onboarding checklist */}
        {showChecklist && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy mb-4">Get started with WorkedWith</p>
            <div className="divide-y divide-gray-50">
              <OnboardingItem done={phone_verified} label="Verify your phone number" href="/verify/phone" />
              {isTrade ? (
                <>
                  <OnboardingItem done={!!tradeProfile} label="Complete your trade profile" href="/onboarding/trade" />
                  <OnboardingItem done={hasLiveJob} label="Log your first job" href="/jobs/log" />
                  <OnboardingItem done={hasBackdatedJob} label="Add a past job" href="/jobs/log/backdated" />
                </>
              ) : (
                <>
                  <OnboardingItem done={hasBackdatedJob} label="Add a past job" href="/jobs/log/backdated" />
                  <OnboardingItem done={false} label="Find a tradesperson" href="/find" />
                </>
              )}
            </div>
          </section>
        )}

        {/* Job history */}
        <JobHistory jobs={jobHistory} />

        {/* Quick actions */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Quick actions</p>
          {isTrade ? (
            <div className="flex flex-wrap gap-3">
              <a
                href="/jobs/log"
                className="rounded-lg bg-brand-amber px-6 py-3 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
              >
                + Log a job
              </a>
              <a
                href="/jobs/log/backdated"
                className="rounded-lg border-2 border-brand-navy px-6 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
              >
                + Add a past job
              </a>
            </div>
          ) : (
            <a
              href="/jobs/log/backdated"
              className="block w-full rounded-lg bg-brand-amber py-3 px-6 text-center text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors sm:inline-block sm:w-auto"
            >
              + Add a past job
            </a>
          )}
        </section>

        {/* Trade reputation */}
        {isTrade && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Your reputation</p>
            {tradeHasReviews ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-4xl font-bold text-brand-navy">
                      {(tradeProfile?.average_rating ?? 0).toFixed(1)}
                    </p>
                    <div className="mt-1 flex text-lg">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span
                          key={s}
                          className={s <= Math.round(tradeProfile?.average_rating ?? 0) ? 'text-brand-amber' : 'text-gray-200'}
                          aria-hidden
                        >★</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>
                      <span className="font-semibold text-brand-navy">{tradeProfile?.total_reviews ?? 0}</span>{' '}
                      verified review{(tradeProfile?.total_reviews ?? 0) !== 1 ? 's' : ''}
                    </p>
                    <p>
                      <span className="font-semibold text-brand-navy">{tradeProfile?.total_jobs ?? 0}</span>{' '}
                      confirmed job{(tradeProfile?.total_jobs ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {tradeProfile?.public_slug && (
                    <a
                      href={`/t/${tradeProfile.public_slug}`}
                      className="ml-auto text-xs font-medium text-brand-amber hover:underline shrink-0"
                    >
                      View profile →
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-6">
                <p className="font-semibold text-gray-700 mb-2">Your WorkedWith reputation</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your rating will appear here once you have completed jobs and received reviews.
                  The more verified jobs you complete, the stronger your profile.
                </p>
              </div>
            )}
          </section>
        )}

        {/* 'both' users — client side label */}
        {isBoth && (
          <p className="text-xs font-bold uppercase tracking-widest text-brand-amber">As a client</p>
        )}

        {/* Client reputation */}
        {isClient && (
          <section>
            {!isBoth && (
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Your reputation</p>
            )}
            {isBoth && (
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Your client reputation</p>
            )}
            {clientHasReviews ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-4xl font-bold text-brand-navy">
                      {(clientProfile?.average_rating ?? 0).toFixed(1)}
                    </p>
                    <div className="mt-1 flex text-lg">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span
                          key={s}
                          className={s <= Math.round(clientProfile?.average_rating ?? 0) ? 'text-brand-amber' : 'text-gray-200'}
                          aria-hidden
                        >★</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>
                      <span className="font-semibold text-brand-navy">{clientProfile?.total_reviews ?? 0}</span>{' '}
                      verified review{(clientProfile?.total_reviews ?? 0) !== 1 ? 's' : ''}
                    </p>
                    <p>
                      <span className="font-semibold text-brand-navy">{clientProfile?.total_jobs ?? 0}</span>{' '}
                      confirmed job{(clientProfile?.total_jobs ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-6">
                <p className="font-semibold text-gray-700 mb-2">Your WorkedWith reputation</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your rating will appear here once you have completed jobs and received reviews.
                  The more verified jobs you complete, the stronger your profile.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Tradesperson search — client role only */}
        {isClient && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Find a tradesperson</p>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <form
                method="GET"
                action="/find"
                className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-center"
              >
                <select
                  name="trade"
                  required
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-brand-navy focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
                >
                  <option value="" disabled>Select a trade type</option>
                  {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  name="postcode"
                  type="text"
                  required
                  placeholder="Postcode"
                  autoComplete="postal-code"
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm uppercase placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
                />
                <select
                  name="radius"
                  defaultValue="10"
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
                >
                  <option value="5">5 miles</option>
                  <option value="10">10 miles</option>
                  <option value="25">25 miles</option>
                  <option value="50">50 miles</option>
                </select>
                <button
                  type="submit"
                  className="h-11 w-full rounded-lg bg-brand-amber px-4 text-sm font-bold text-brand-navy whitespace-nowrap hover:bg-amber-400 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Recent activity */}
        {notifications.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent activity</p>
              <a href="/notifications" className="text-xs font-medium text-brand-amber hover:underline">
                See all
              </a>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-50 overflow-hidden shadow-sm">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3.5 ${!n.is_read ? 'bg-amber-50/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title ?? 'Notification'}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{n.body}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-gray-400">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {notifications.length === 0 && hasJobs && (
          <section className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">No recent activity</p>
            <p className="mt-1 text-xs text-gray-400">Job updates, reviews, and notifications will appear here.</p>
          </section>
        )}

      </div>
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────

function OnboardingItem({
  done,
  label,
  href,
}: {
  done: boolean
  label: string
  href: string
}) {
  return (
    <a
      href={done ? undefined : href}
      aria-disabled={done}
      className={`flex items-center gap-3 py-3 px-1 transition-colors ${
        done ? 'cursor-default' : 'hover:bg-gray-50 rounded-lg'
      }`}
    >
      <span
        className={`shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
          done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 bg-white'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <span className={`flex-1 text-sm ${done ? 'text-gray-400 line-through' : 'font-medium text-brand-navy'}`}>
        {label}
      </span>
      {!done && (
        <span className="text-gray-400 text-sm" aria-hidden>→</span>
      )}
    </a>
  )
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
