import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/components/app-header'
import { UsernameCard } from '@/components/username-card'
import { getJobHistory } from '@/actions/get-job-history'
import { getTradeRequests } from '@/actions/get-trade-requests'
import { getJobRequests } from '@/actions/get-job-requests'
import type { JobRequest } from '@/actions/get-job-requests'
import type { TradeRequest } from '@/actions/get-trade-requests'
import { InviteDecision } from '@/components/invite-decision'
import { aJobLabel } from '@/lib/trade-types'
import { JobHistory } from '@/components/job-history'
import { TradeSearchForm } from './trade-search-form'
import { ClientLookupForm } from '@/components/client-lookup-form'
import { getProfileAnalytics } from '@/actions/get-profile-analytics'
import type { ProfileAnalytics } from '@/actions/get-profile-analytics'
import type { User, Notification, SubscriptionTier } from '@/types/database'

export const metadata = { title: 'Dashboard | WorkedWith', robots: { index: false } }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData) redirect('/')

  const { verification_tier, user_type, full_name, phone_verified, id_verification_status, profile_photo_url } = userData as unknown as User
  if (verification_tier === 'unverified') redirect('/verify/phone')
  if (!user_type) redirect('/join')

  const isTrade = user_type === 'trade' || user_type === 'both'
  const isBoth = user_type === 'both'
  const isClient = isBoth || !isTrade
  const firstName = full_name.split(' ')[0]
  const initials = full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  const [
    { data: rawNotifications },
    { data: tradeProfile },
    { data: clientProfile },
    jobHistory,
    tradeRequests,
    jobRequests,
  ] = await Promise.all([
    admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    isTrade
      ? admin.from('trade_profiles').select('id, average_rating, total_reviews, total_jobs, public_slug, subscription_tier, trade_types, operating_areas').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    isClient
      ? admin.from('client_profiles').select('id, average_rating, total_reviews, total_jobs, username').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    getJobHistory(),
    isTrade ? getTradeRequests() : Promise.resolve([] as TradeRequest[]),
    getJobRequests(),
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
  const hasOperatingAreas = ((tradeProfile as unknown as { operating_areas?: string[] } | null)?.operating_areas?.length ?? 0) > 0
  const clientHasReviews = (clientProfile?.total_reviews ?? 0) > 0

  const hasJobs = isTrade
    ? (tradeProfile?.total_jobs ?? 0) > 0
    : (clientProfile?.total_jobs ?? 0) > 0

  const accountLabel =
    user_type === 'trade' ? 'Tradesperson' :
    user_type === 'client_individual' ? 'Client' :
    user_type === 'client_business' ? 'Business client' :
    user_type === 'both' ? 'Tradesperson & Client' : 'Account'

  const pendingCount = jobRequests.length

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">

        {/* ── Client-only welcome row ───────────────────── */}
        {!isTrade && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div>
                <h1 className="text-2xl font-bold text-brand-navy">
                  Welcome back, {firstName}
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">{accountLabel} account</p>
              </div>
              {pendingCount > 0 && (
                <a
                  href="#your-requests"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-base leading-none">⏳</span>
                  {pendingCount} to confirm
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
              <a
                href="/jobs/log/invite-trade"
                className="flex min-h-[44px] items-center justify-center rounded-lg bg-brand-amber px-3 text-center text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors sm:px-4"
              >
                + Invite a tradesperson
              </a>
              <a
                href="/jobs/log/backdated"
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-brand-navy px-3 text-center text-sm font-semibold text-brand-navy hover:bg-gray-50 transition-colors sm:px-4"
              >
                + Add a past job
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TRADE LAYOUT  (trade + both users)
        ══════════════════════════════════════════════ */}
        {isTrade && (
          <>
            {/* Requests waiting on this trade */}
            {(tradeRequests.length > 0 || jobRequests.length > 0) && (
              <RequestsBox tradeRequests={tradeRequests} jobRequests={jobRequests} />
            )}

            {/* 0. Why WorkedWith */}
            <section className="rounded-xl border border-brand-navy/10 bg-brand-navy/5 p-5">
              <p className="text-sm font-semibold text-brand-navy">Why WorkedWith?</p>
              <ul className="mt-3 space-y-2">
                {[
                  'Check a client\'s record before you take the job on',
                  'Build a profile of verified reviews that wins you work',
                  'Fair reviews: neither side sees the other\'s until both are in',
                  'Free to start, with unlimited jobs and reviews',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 font-bold text-brand-amber" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 1. Profile summary card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                {profile_photo_url ? (
                  <img
                    src={profile_photo_url}
                    alt="Profile photo"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-brand-navy flex items-center justify-center text-white text-xl font-bold select-none">
                    {initials}
                  </div>
                )}
                <a href="/profile" className="text-[11px] text-gray-400 hover:text-brand-amber transition-colors">
                  {profile_photo_url ? 'Change photo' : 'Add photo'}
                </a>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-brand-navy truncate">{full_name}</h1>
                {((tradeProfile?.trade_types as string[] | undefined) ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(tradeProfile?.trade_types as string[]).map(t => (
                      <span key={t} className="bg-amber-100 text-amber-800 text-xs rounded-full px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
                {tradeHasReviews ? (
                  <p className="text-sm text-gray-500 mt-1.5">
                    ★ {(tradeProfile?.average_rating ?? 0).toFixed(1)} · {tradeProfile?.total_reviews ?? 0} review{(tradeProfile?.total_reviews ?? 0) !== 1 ? 's' : ''}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1.5">No reviews yet</p>
                )}
              </div>
              {tradeProfile?.public_slug && (
                <a
                  href={`/t/${tradeProfile.public_slug}`}
                  className="shrink-0 text-sm text-brand-navy border border-brand-navy rounded-lg px-3 py-1.5 whitespace-nowrap hover:bg-brand-navy hover:text-white transition-colors"
                >
                  View profile
                </a>
              )}
            </div>

            {/* Operating areas nudge — only shown when profile exists but no areas set */}
            {tradeProfile && !hasOperatingAreas && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Your profile isn&apos;t appearing in search yet.</span>
                  {' '}Add at least one operating area to be discoverable.
                </p>
                <a
                  href="/profile/areas"
                  className="shrink-0 rounded-lg bg-brand-amber px-4 py-2 text-xs font-bold text-brand-navy hover:bg-amber-400 transition-colors whitespace-nowrap"
                >
                  Add areas
                </a>
              </div>
            )}

            {isBoth && (
              <p className="text-xs font-bold uppercase tracking-widest text-brand-amber">As a tradesperson</p>
            )}

            {/* 2. Onboarding checklist */}
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
                      label="Get your ID verified"
                      href="/verify/identity"
                      helper="Clients are more likely to choose a trade with a verified ID. Send a photo of a driving licence or passport, then a quick selfie on your phone. We check them and delete them straight after, and they are never shown on your profile."
                    />
                  )}
                </div>
              </section>
            )}

            {/* 3. Quick actions */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Quick actions</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href="/jobs/log"
                  className="flex min-h-[44px] flex-col items-center justify-center rounded-lg bg-brand-amber px-4 py-3 text-center text-brand-navy hover:bg-amber-400 transition-colors"
                >
                  <span className="text-sm font-semibold">+ Log a job with a client</span>
                  <span className="mt-0.5 text-xs font-medium text-brand-navy/70">Work coming up or under way</span>
                </a>
                <a
                  href="/jobs/log/backdated"
                  className="flex min-h-[44px] flex-col items-center justify-center rounded-lg border-2 border-brand-navy px-4 py-3 text-center text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                >
                  <span className="text-sm font-semibold">+ Add a past job</span>
                  <span className="mt-0.5 text-xs font-medium opacity-70">Work you have already finished</span>
                </a>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                You invite your client, they confirm the job on WorkedWith, and when the work is done you both leave a review.
              </p>
            </section>

            {/* 4. Client lookup */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Client lookup</p>
              <ClientLookupForm />
            </section>

            {/* 5. Trade reputation */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Your reputation</p>
              {tradeHasReviews ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-4xl font-bold text-brand-navy">
                        {(tradeProfile?.average_rating ?? 0).toFixed(1)}
                      </p>
                      <div className="mt-1 flex text-lg" aria-hidden>
                        {[1, 2, 3, 4, 5].map(s => (
                          <span
                            key={s}
                            className={s <= Math.round(tradeProfile?.average_rating ?? 0) ? 'text-brand-amber' : 'text-gray-200'}
                          >★</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p>
                        <span className="font-semibold text-brand-navy">{tradeProfile?.total_reviews ?? 0}</span>{' '}
                        review{(tradeProfile?.total_reviews ?? 0) !== 1 ? 's' : ''}
                      </p>
                      <p>
                        <span className="font-semibold text-brand-navy">{tradeProfile?.total_jobs ?? 0}</span>{' '}
                        confirmed job{(tradeProfile?.total_jobs ?? 0) !== 1 ? 's' : ''}
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

            {/* 6. Your jobs */}
            <JobHistory jobs={jobHistory} />

            {/* 7. Analytics — Pro stats or upgrade prompt */}
            {isProTrade && analyticsData ? (
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Analytics: {analyticsData.periodLabel}</p>
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
            ) : !isProTrade ? (
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
            ) : null}

            {/* isBoth: client side label */}
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
                          review{(clientProfile?.total_reviews ?? 0) !== 1 ? 's' : ''}
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
                <TradeSearchForm />
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
              <TradeSearchForm />
            </section>

            {/* Your username */}
            {typeof clientProfile?.username === 'string' && clientProfile.username && (
              <UsernameCard username={clientProfile.username} />
            )}

            {/* 2. Jobs waiting for this client to accept */}
            {jobRequests.length > 0 && <RequestsBox tradeRequests={[]} jobRequests={jobRequests} />}

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
                        review{(clientProfile?.total_reviews ?? 0) !== 1 ? 's' : ''}
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

function RequestsBox({ tradeRequests, jobRequests }: { tradeRequests: TradeRequest[]; jobRequests: JobRequest[] }) {
  const total = tradeRequests.length + jobRequests.length
  return (
    <section id="your-requests" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">
        {total === 1 ? '1 job waiting for you to accept' : `${total} jobs waiting for you to accept`}
      </p>
      <p className="mt-1 text-sm text-amber-800">
        Accept a job you really did together and you can both leave a review. Decline it if it is not right.
      </p>
      <ul className="mt-4 space-y-4">
        {tradeRequests.map(r => (
          <li key={r.id} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy break-words">{r.clientName}</p>
            <p className="mt-0.5 text-sm text-gray-600">{aJobLabel(r.jobType)}, {r.jobDate}</p>
            {r.description && <p className="mt-1 text-sm text-gray-500 break-words">{r.description}</p>}
            <div className="mt-3"><InviteDecision token={r.token} compact /></div>
          </li>
        ))}
        {jobRequests.map(r => (
          <li key={r.id} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy break-words">{r.fromName}</p>
            <p className="mt-0.5 text-sm text-gray-600">
              {aJobLabel(r.jobType)}{r.when ? `, ${r.when}` : ''}{r.isBackdated ? ' (already finished)' : ''}
            </p>
            {r.description && <p className="mt-1 text-sm text-gray-500 break-words">{r.description}</p>}
            <div className="mt-3"><InviteDecision token={r.token} kind="job" compact /></div>
          </li>
        ))}
      </ul>
    </section>
  )
}
