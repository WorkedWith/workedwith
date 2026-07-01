import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { UserMenu } from '@/components/user-menu'
import { TRADE_TYPES } from '@/lib/trade-types'
import { getJobHistory } from '@/actions/get-job-history'
import { JobHistory } from '@/components/job-history'
import { ClientLookupForm } from '@/components/client-lookup-form'
import { getProfileAnalytics } from '@/actions/get-profile-analytics'
import type { ProfileAnalytics } from '@/actions/get-profile-analytics'
import type { User, Notification, SubscriptionTier } from '@/types/database'

export const metadata = { title: 'Dashboard — WorkedWith' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData) redirect('/')

  const { verification_tier, user_type, full_name, phone_verified, id_verification_status } = userData as unknown as User
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
          .eq('status', 'pending_confirmation')
          .eq('initiated_by', 'trade'),
    getJobHistory(),
  ])

  const notifications = (rawNotifications ?? []) as unknown as Notification[]

  const tpId = tradeProfile ? (tradeProfile as unknown as { id: string }).id : undefined
  const cpId = clientProfile ? (clientProfile as unknown as { id: string }).id : undefined
  const isProTrade = isTrade && (tradeProfile?.subscription_tier as SubscriptionTier | null) === 'pro'

  let hasLiveJob = false
  let hasBackdatedJobTrade = false
  let hasBackdatedJobClient = false
  let analyticsData: ProfileAnalytics | null = null

  if (isTrade && tpId) {
    const [
      [{ count: liveCount }, { count: backdatedCount }],
      analyticsResult,
    ] = await Promise.all([
      Promise.all([
        admin.from('jobs').select('id', { count: 'exact', head: true })
          .eq('trade_profile_id', tpId).eq('is_backdated', false),
        admin.from('jobs').select('id', { count: 'exact', head: true })
          .eq('trade_profile_id', tpId).eq('is_backdated', true),
      ]),
      isProTrade && tpId ? getProfileAnalytics(tpId) : Promise.resolve(null),
    ])
    hasLiveJob = (liveCount ?? 0) > 0
    hasBackdatedJobTrade = (backdatedCount ?? 0) > 0
    if (analyticsResult?.success) analyticsData = analyticsResult.data
  }

  if (cpId) {
    const { count } = await admin.from('jobs').select('id', { count: 'exact', head: true })
      .eq('client_profile_id', cpId).eq('is_backdated', true)
    hasBackdatedJobClient = (count ?? 0) > 0
  }

  const hasBackdatedJob = hasBackdatedJobTrade || hasBackdatedJobClient

  const idVerified = id_verification_status === 'pending' || id_verification_status === 'approved'
  const showChecklist = isTrade
    ? (!phone_verified || !tradeProfile || !hasLiveJob || !hasBackdatedJob || !idVerified)
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

  const pendingCount = pendingJobsCount ?? 0

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-brand-navy px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <a href="/dashboard" className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">

        {/* ── Welcome row ──────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">
              Welcome back, {firstName}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{accountLabel} account</p>
          </div>
          {isTrade ? (
            /* Trade: active-jobs badge */
            pendingCount > 0 ? (
              <div className="shrink-0 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-center">
                <p className="text-xl font-bold text-amber-700">{pendingCount}</p>
                <p className="text-xs text-amber-600">
                  active job{pendingCount !== 1 ? 's' : ''}
                </p>
              </div>
            ) : null
          ) : (
            /* Client: pending badge + quick action button */
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
              {pendingCount > 0 && (
                <a
                  href="#your-jobs"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-base leading-none">⏳</span>
                  {pendingCount} to confirm
                </a>
              )}
              <a
                href="/jobs/log/backdated"
                className="whitespace-nowrap rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
              >
                + Add a past job
              </a>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            TRADE LAYOUT  (trade + both users)
        ══════════════════════════════════════════════ */}
        {isTrade && (
          <>
            {isBoth && (
              <p className="text-xs font-bold uppercase tracking-widest text-brand-amber">As a tradesperson</p>
            )}

            {/* Trade checklist */}
            {showChecklist && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-brand-navy mb-4">Get started with WorkedWith</p>
                <div className="divide-y divide-gray-50">
                  <OnboardingItem done={phone_verified} label="Verify your phone number" href="/verify/phone" />
                  <OnboardingItem done={!!tradeProfile} label="Complete your trade profile" href="/onboarding/trade" />
                  <OnboardingItem done={hasLiveJob} label="Log your first job" href="/jobs/log" />
                  <OnboardingItem done={hasBackdatedJob} label="Add a past job" href="/jobs/log/backdated" />
                  {phone_verified && (
                    <OnboardingItem
                      done={id_verification_status === 'pending' || id_verification_status === 'approved'}
                      label="Get your Verified badge"
                      href="/verify/identity"
                      helper="Submit your driving licence for identity verification. Your document is reviewed securely and deleted immediately after. Never visible on your profile."
                    />
                  )}
                </div>
              </section>
            )}

            {/* Analytics — Pro users only, shown near top as a key paid feature */}
            {isProTrade && analyticsData && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Analytics — {analyticsData.periodLabel}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
                    <p className="text-3xl font-bold text-brand-navy">{analyticsData.profileViews}</p>
                    <p className="mt-1 text-xs text-gray-500">Profile views this month</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
                    <p className="text-3xl font-bold text-brand-navy">{analyticsData.searchAppearances}</p>
                    <p className="mt-1 text-xs text-gray-500">Search appearances this month</p>
                  </div>
                </div>
              </section>
            )}

            {/* Job history */}
            <JobHistory jobs={jobHistory} />

            {/* Quick actions */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Quick actions</p>
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
            </section>

            {/* Look up a client */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Client lookup</p>
              <ClientLookupForm />
            </section>

            {/* Trade reputation */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Your reputation</p>
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

            {/* Analytics upsell — shown at bottom for non-Pro users */}
            {!isProTrade && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Analytics</p>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Profile analytics available on Pro</p>
                    <p className="mt-0.5 text-xs text-gray-500">See how many people view your profile and find you in search.</p>
                  </div>
                  <a
                    href="/subscription"
                    className="shrink-0 rounded-lg bg-brand-amber px-4 py-2 text-xs font-bold text-brand-navy hover:bg-amber-400 transition-colors"
                  >
                    Upgrade
                  </a>
                </div>
              </section>
            )}

            {/* 'both' client side */}
            {isBoth && (
              <p className="text-xs font-bold uppercase tracking-widest text-brand-amber">As a client</p>
            )}

            {isBoth && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Your client reputation</p>
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
                      Complete jobs and receive reviews from tradespeople to build your WorkedWith score.
                      Your score shows other tradespeople you are a reliable client.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Find a tradesperson — both users only */}
            {isBoth && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Find a tradesperson</p>
                <FindTradeForm />
              </section>
            )}

            {/* Recent activity */}
            {notifications.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Recent activity</p>
                  <a href="/notifications" className="text-xs font-medium text-brand-amber hover:underline">
                    See all
                  </a>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-50 overflow-hidden shadow-sm">
                  {notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3.5 ${!n.is_read ? 'bg-amber-50/40' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {n.title ?? 'Notification'}
                          </p>
                          {n.body && (
                            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{n.body}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-xs text-gray-400">{timeAgo(n.created_at)}</p>
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
          </>
        )}

        {/* ══════════════════════════════════════════════
            CLIENT-ONLY LAYOUT  (client_individual / client_business)
        ══════════════════════════════════════════════ */}
        {!isTrade && (
          <>
            {/* 1. Find a tradesperson */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Find a tradesperson</p>
              <FindTradeForm />
            </section>

            {/* 2. Pending actions banner — only jobs logged BY the tradesperson */}
            {pendingCount > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-4">
                <div className="shrink-0 mt-0.5 h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h3a.75.75 0 000-1.5H10.75V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-800 text-sm">
                    You have {pendingCount} job{pendingCount !== 1 ? 's' : ''} to confirm
                  </p>
                  <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                    A tradesperson has logged a job with you. Review and confirm it happened.
                  </p>
                </div>
                <a
                  href="#your-jobs"
                  className="shrink-0 self-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                  View jobs
                </a>
              </div>
            )}

            {/* 3. Your reputation */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Your reputation</p>
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
                    Complete jobs and receive reviews from tradespeople to build your WorkedWith score.
                    Your score shows other tradespeople you are a reliable client.
                  </p>
                </div>
              )}
            </section>

            {/* 4. Your jobs */}
            <div id="your-jobs">
              <JobHistory jobs={jobHistory} />
            </div>

            {/* 5. Onboarding checklist */}
            {showChecklist && (
              <section className="rounded-xl bg-brand-navy/5 border border-brand-navy/10 p-5">
                <p className="text-sm font-semibold text-brand-navy mb-4">Get started with WorkedWith</p>
                <div className="divide-y divide-brand-navy/10">
                  <OnboardingItem done={phone_verified} label="Verify your phone number" href="/verify/phone" />
                  <OnboardingItem done={hasBackdatedJob} label="Add your first past job" href="/jobs/log/backdated" />
                  <ExploreItem />
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────

function FindTradeForm() {
  return (
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
  )
}

function OnboardingItem({
  done,
  label,
  href,
  helper,
}: {
  done: boolean
  label: string
  href: string
  helper?: string
}) {
  return (
    <a
      href={done ? undefined : href}
      aria-disabled={done}
      className={`flex items-start gap-3 py-3 px-1 transition-colors ${
        done ? 'cursor-default' : 'hover:bg-black/5 rounded-lg'
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
          done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 bg-white'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm ${done ? 'text-gray-400 line-through' : 'font-medium text-brand-navy'}`}>
          {label}
        </span>
        {helper && !done && (
          <span className="block text-xs text-gray-400 mt-0.5 leading-relaxed">{helper}</span>
        )}
      </span>
      {!done && (
        <span className="mt-0.5 text-gray-400 text-sm shrink-0" aria-hidden>→</span>
      )}
    </a>
  )
}

function ExploreItem() {
  return (
    <a
      href="/find"
      className="flex items-center gap-3 py-3 px-1 rounded-lg hover:bg-black/5 transition-colors"
    >
      <span className="shrink-0 h-5 w-5 rounded-full border-2 border-brand-amber/60 bg-white flex items-center justify-center text-[10px] font-bold text-brand-amber">
        →
      </span>
      <span className="flex-1 text-sm font-medium text-brand-navy">Find a tradesperson</span>
      <span className="text-xs font-semibold text-brand-amber tracking-wide uppercase">Explore →</span>
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
