import { SiteHeader } from '@/components/site-header'
import { Avatar } from '@/components/avatar'
import { ALL_SPECIALISMS } from '@/lib/trade-types'
import { APP_HOST, APP_URL } from '@/lib/app-url'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { VerificationTier, SeededProfile } from '@/types/database'
import { CopyUrlButton } from './copy-url-button'
import { getFeaturedJobs } from '@/actions/featured-jobs/get-featured-jobs'
import { FeaturedWorkSection } from '@/components/featured-work-section'

function SeededProfilePage({ profile, signedIn }: { profile: SeededProfile; slug: string; signedIn: boolean }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 pb-8 pt-10 sm:px-6">
        <div className="mx-auto max-w-2xl">
          {/* "Not yet on WorkedWith" — prominent, always visible */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/80 ring-1 ring-white/20">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
            Not yet on WorkedWith
          </div>

          <h1 className="text-3xl font-bold text-white sm:text-4xl">{profile.business_name}</h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-amber/20 px-3 py-1 text-sm font-medium text-brand-amber">
              {profile.trade_category}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-5">

        {/* Bio, from the business's own public page */}
        {profile.bio && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              About
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{profile.bio}</p>
          </section>
        )}

        {/* Operating areas */}
        {profile.operating_areas.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Operating in
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.operating_areas.map(district => (
                <span
                  key={district}
                  className="rounded-full bg-brand-navy/10 px-3 py-1 text-sm font-medium text-brand-navy"
                >
                  {district}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Contact: email only, signed in members only. Phone numbers are never seeded. */}
        {profile.contact_email && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Contact</h2>
            {signedIn ? (
              <a
                href={`mailto:${profile.contact_email}`}
                className="inline-flex min-h-[44px] w-full items-center justify-center break-all rounded-xl border border-gray-300 px-5 text-sm font-semibold text-brand-navy hover:bg-gray-50 transition-colors sm:w-auto"
              >
                {profile.contact_email}
              </a>
            ) : (
              <div>
                <p className="text-sm text-gray-600">
                  Contact details are shown to signed in members only. It is free to join.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    href="/join/client"
                    className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
                  >
                    Create a free account
                  </a>
                  <a
                    href="/sign-in"
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-gray-300 px-5 text-sm font-semibold text-brand-navy hover:bg-gray-50 transition-colors"
                  >
                    Sign in
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Explanation */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
          <p className="text-sm font-semibold text-amber-900">This business has not joined WorkedWith yet</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700">
            WorkedWith is where clients and tradespeople review each other after every job. This listing
            was created to help clients find local tradespeople. The business has been invited to claim it.
          </p>
        </section>

        {/* Claim CTA */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm font-semibold text-brand-navy">Is this your business?</p>
          <p className="mt-1 mb-4 text-sm text-gray-500">
            Claiming is free and takes a few minutes.
          </p>
          <a
            href={`/claim/${profile.claim_token}`}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
          >
            Claim this listing
          </a>
        </section>

      </div>
    </main>
  )
}

// ── Page ──────────────────────────────────────────────────────

export async function TradeProfileView({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const admin = createAdminClient()

  // 1. Trade profile (real, claimed)
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('public_slug', slug)
    .maybeSingle()

  // 2. If no real profile, check seeded profiles
  if (!tradeProfile) {
    const { data: rawSeeded } = await admin
      .from('seeded_profiles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'unclaimed')
      .maybeSingle()

    if (rawSeeded) {
      const seededSupabase = await createClient()
      const { data: { user: seededViewer } } = await seededSupabase.auth.getUser()
      return (
        <>
          <SiteHeader />
          <SeededProfilePage profile={rawSeeded as unknown as SeededProfile} slug={slug} signedIn={Boolean(seededViewer)} />
        </>
      )
    }

    notFound()
  }

  const tradeTypes = tradeProfile.trade_types as string[]
  const userId = tradeProfile.user_id as string

  const tradeProfileId = tradeProfile.id as string

  // 2. Parallel: user row + visible reviews + reviewer activity + featured jobs + current viewer
  const supabase = await createClient()
  const [
    { data: tradeUser },
    { data: reviews },
    { data: reviewerActivity },
    featuredJobs,
    { data: { user: currentUser } },
  ] = await Promise.all([
    admin.from('users').select('*').eq('id', userId).single(),
    admin
      .from('reviews')
      .select('*')
      .eq('reviewee_id', userId)
      .eq('reviewee_type', 'trade')
      .eq('is_visible', true)
      .order('created_at', { ascending: false }),
    admin
      .from('reviews')
      .select('id')
      .eq('reviewer_id', userId)
      .eq('reviewer_type', 'trade')
      .eq('is_visible', true)
      .limit(1),
    getFeaturedJobs(tradeProfileId),
    supabase.auth.getUser(),
  ])

  // Fire-and-forget view log
  if (!preview) {
    admin.from('profile_views').insert({
      trade_profile_id: tradeProfileId,
      viewer_id: currentUser?.id ?? null,
      source: 'direct',
    }).then(() => {})
  }

  if (!tradeUser) notFound()

  const verTier = tradeUser.verification_tier as VerificationTier
  const displayName = (tradeProfile.company_name as string | null) ?? tradeUser.full_name as string
  const reviewList = reviews ?? []
  const reviewsClients = (reviewerActivity?.length ?? 0) > 0
  const profileUrl = `${APP_URL}/t/${slug}`
  // Contact details are only sent to signed in viewers
  const contactPhone = currentUser && tradeUser.phone_verified && typeof tradeUser.phone === 'string' ? tradeUser.phone : null
  const mainTrades = tradeTypes.filter(t => !ALL_SPECIALISMS.includes(t))
  const specialisms = tradeTypes.filter(t => ALL_SPECIALISMS.includes(t))
  const mailtoHref = (() => {
    const subject = `Enquiry via WorkedWith: ${displayName}`
    const body = `Hello,\n\nI found your profile on WorkedWith (${profileUrl}) and would like to ask about some work.\n\nThe job:\nMy postcode:\nWhen I need it done:\n\nThank you`
    return `mailto:${tradeUser.email as string}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  })()
  const contactEmail = currentUser && typeof tradeUser.email === 'string' ? tradeUser.email : null
  const hasContactBar = Boolean(currentUser) ? Boolean(contactPhone || contactEmail) : true

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: tradeUser.full_name as string,
    jobTitle: tradeTypes.length > 0 ? tradeTypes.join(', ') : 'Tradesperson',
    areaServed: ((tradeProfile.operating_areas as string[] | null) ?? []).map(code => ({
      '@type': 'Place',
      name: code,
    })),
    url: profileUrl,
  }

  return (
    <>
      {!preview && <SiteHeader />}
      {!preview && currentUser?.id === (tradeProfile.user_id as string) && (
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm text-gray-600">This is how clients see you.</p>
            <a
              href="/profile/edit"
              className="shrink-0 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Edit profile
            </a>
          </div>
        </div>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className={preview ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
        {/* ── Header ─────────────────────────────────────────── */}
        <header className={preview ? 'mx-auto max-w-2xl px-4 pt-2 sm:px-6' : 'bg-brand-navy px-4 pb-6 pt-6 sm:px-6'}>
          <div className={preview ? 'rounded-2xl bg-brand-navy px-5 pb-5 pt-5' : 'mx-auto max-w-2xl'}>
            <div className="flex items-center gap-4">
              <Avatar
                name={displayName}
                photoUrl={typeof tradeUser.profile_photo_url === 'string' ? tradeUser.profile_photo_url : null}
                sizeClass="h-16 w-16 sm:h-20 sm:w-20"
                textClass="text-xl sm:text-2xl"
                ringClass="border-2 border-white/20"
              />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-white sm:text-3xl">{displayName}</h1>
                <p className="mt-1 text-sm text-white/60">
                  {tradeProfile.company_name && (tradeUser.full_name as string) !== displayName
                    ? `${tradeUser.full_name as string} · `
                    : ''}
                  Member since {memberSinceYear(tradeUser.created_at as string)}
                </p>
              </div>
            </div>

            {mainTrades.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {mainTrades.slice(0, 3).map(t => (
                  <span key={t} className="rounded-full bg-brand-amber/20 px-3 py-1 text-sm font-semibold text-brand-amber">
                    {t}
                  </span>
                ))}
                {mainTrades.length > 3 && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/80">
                    +{mainTrades.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        <div className={`mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-4 ${hasContactBar && !preview ? 'pb-32' : ''}`}>

          {/* ── Trust card ───────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="shrink-0 text-center">
                {(tradeProfile.total_reviews as number) > 0 ? (
                  <>
                    <p className="text-4xl font-bold leading-none text-brand-navy">
                      {(tradeProfile.average_rating as number).toFixed(1)}
                    </p>
                    <div className="mt-1.5"><Stars rating={tradeProfile.average_rating as number} size="lg" /></div>
                  </>
                ) : (
                  <p className="text-2xl font-bold leading-none text-brand-navy">New</p>
                )}
              </div>
              <div className="text-sm leading-relaxed text-gray-600">
                {(tradeProfile.total_reviews as number) > 0 ? (
                  <p>
                    <span className="font-semibold text-brand-navy">{tradeProfile.total_reviews as number}</span>{' '}
                    review{(tradeProfile.total_reviews as number) !== 1 ? 's' : ''} confirmed by both sides
                  </p>
                ) : (
                  <p>No reviews yet. They appear once both sides have submitted.</p>
                )}
                {(tradeProfile.total_jobs as number) > 0 && (
                  <p>
                    <span className="font-semibold text-brand-navy">{tradeProfile.total_jobs as number}</span>{' '}
                    job{(tradeProfile.total_jobs as number) !== 1 ? 's' : ''} confirmed on WorkedWith
                  </p>
                )}
              </div>
            </div>
            {((verTier === 'phone_verified' || verTier === 'fully_verified') || (tradeProfile.subscription_tier as string) === 'pro' || (tradeProfile.subscription_tier as string) === 'standard') && (
              <ul className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
                {(verTier === 'phone_verified' || verTier === 'fully_verified') && (
                  <TrustTick>Phone number verified</TrustTick>
                )}
                {verTier === 'fully_verified' && <TrustTick>ID checked by WorkedWith</TrustTick>}
                {(tradeProfile.subscription_tier as string) === 'pro' && <TrustTick amber>Pro member</TrustTick>}
                {(tradeProfile.subscription_tier as string) === 'standard' && <TrustTick amber>Verified member</TrustTick>}
              </ul>
            )}
          </section>

          {/* ── About, specialisms and areas ─────────────────── */}
          {((typeof tradeProfile.bio === 'string' && tradeProfile.bio.trim()) || mainTrades.length > 0 || specialisms.length > 0 || ((tradeProfile.operating_areas as string[]) ?? []).length > 0) && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              {typeof tradeProfile.bio === 'string' && tradeProfile.bio.trim() && (
                <>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">About</h2>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700">{tradeProfile.bio}</p>
                </>
              )}
              {mainTrades.length > 0 && (
                <div className={typeof tradeProfile.bio === 'string' && tradeProfile.bio.trim() ? 'mt-5 border-t border-gray-100 pt-5' : ''}>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Trades{(tradeProfile.years_experience as number | null) !== null ? ` · ${tradeProfile.years_experience as number} years in the trade` : ''}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {mainTrades.map(t => (
                      <span key={t} className="rounded-full bg-brand-navy/10 px-2.5 py-1 text-xs font-semibold text-brand-navy">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {specialisms.length > 0 && (
                <div className={(typeof tradeProfile.bio === 'string' && tradeProfile.bio.trim()) || mainTrades.length > 0 ? 'mt-5 border-t border-gray-100 pt-5' : ''}>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Specialisms</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {specialisms.map(sp => (
                      <span key={sp} className="rounded-full bg-brand-amber/15 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {((tradeProfile.operating_areas as string[]) ?? []).length > 0 && (() => {
                const areas = tradeProfile.operating_areas as string[]
                const shown = areas.slice(0, 6)
                const rest = areas.slice(6)
                const hasAbove = Boolean((typeof tradeProfile.bio === 'string' && tradeProfile.bio.trim()) || mainTrades.length > 0 || specialisms.length > 0)
                return (
                  <div className={hasAbove ? 'mt-5 border-t border-gray-100 pt-5' : ''}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Areas covered</h2>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {shown.map(d => (
                        <span key={d} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{d}</span>
                      ))}
                    </div>
                    {rest.length > 0 && (
                      <details className="group mt-2">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-amber-700 group-open:hidden">
                          Show all {areas.length}
                        </summary>
                        <div className="flex flex-wrap gap-1.5">
                          {rest.map(d => (
                            <span key={d} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{d}</span>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )
              })()}
            </section>
          )}

          {/* ── Review history ────────────────────────────────── */}
          {reviewList.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
                Reviews ({reviewList.length})
              </h2>
              <div className="space-y-4">
                {reviewList.map(review => {
                  const rid = review.id as string
                  const rating = review.overall_rating as number | null
                  const written = review.written_review as string | null
                  const qualScore = review.quality_score as number | null
                  const commScore = review.communication_score as number | null
                  const relScore = review.reliability_score as number | null
                  const valScore = review.value_score as number | null
                  const wha = review.would_work_again as boolean | null
                  const submittedAt = review.submitted_at as string
                  const isBackdated = review.is_backdated as boolean
                  const disputeStatus = review.dispute_status as string | null | undefined

                  return (
                    <article
                      key={rid}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                    >
                      {/* Top row: stars + date */}
                      <div className="flex items-start justify-between gap-4">
                        {rating !== null ? (
                          <Stars rating={rating} size="base" />
                        ) : (
                          <span className="text-sm text-gray-400">No rating</span>
                        )}
                        <time
                          dateTime={submittedAt}
                          className="shrink-0 text-sm text-gray-400"
                        >
                          {fmtMonthYear(submittedAt)}
                        </time>
                      </div>

                      {/* Badges */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          Verified client
                        </span>
                        {isBackdated && (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            Verified past job
                          </span>
                        )}
                        {disputeStatus === 'open' && (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            Under dispute
                          </span>
                        )}
                      </div>

                      {/* Written review */}
                      {written && (
                        <p className="mt-3 text-sm leading-relaxed text-gray-700">{written}</p>
                      )}

                      {/* Sub-scores */}
                      {(qualScore !== null || commScore !== null || relScore !== null || valScore !== null) && (
                        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
                          {qualScore !== null && (
                            <SubScoreRow label="Quality" score={qualScore} />
                          )}
                          {commScore !== null && (
                            <SubScoreRow label="Communication" score={commScore} />
                          )}
                          {relScore !== null && (
                            <SubScoreRow label="Reliability" score={relScore} />
                          )}
                          {valScore !== null && (
                            <SubScoreRow label="Value" score={valScore} />
                          )}
                        </div>
                      )}

                      {/* Would hire again */}
                      {wha !== null && (
                        <p className="mt-3 text-sm text-gray-600">
                          Would hire again:{' '}
                          <span
                            className={
                              wha
                                ? 'font-semibold text-green-600'
                                : 'font-medium text-gray-500'
                            }
                          >
                            {wha ? 'Yes' : 'No'}
                          </span>
                        </p>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Featured work ────────────────────────────────── */}
          {featuredJobs.length > 0 && (
            <FeaturedWorkSection
              jobs={featuredJobs}
              supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
            />
          )}

          {/* ── Also reviews clients ──────────────────────────── */}
          {reviewsClients && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-semibold text-amber-900">
                This tradesperson reviews their clients too
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-700">
                Reviews go both ways on WorkedWith, keeping both sides accountable.
              </p>
            </section>
          )}

          {/* ── Share section ─────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-brand-navy">Share this profile</h2>
            <div className="flex items-center gap-3">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
                {APP_HOST}/t/{slug}
              </code>
              <CopyUrlButton url={profileUrl} />
            </div>
          </section>

        </div>
      </main>
      {/* ── Contact bar ───────────────────────────────────── */}
      {hasContactBar && (
        <div className={preview ? 'mx-auto max-w-2xl px-4 pb-6 sm:px-6' : 'fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(15,31,61,0.08)]'}>
          <div className={preview ? 'flex gap-3' : 'mx-auto flex max-w-2xl gap-3 px-4 pb-5 pt-3 sm:px-6'}>
            {currentUser ? (
              <>
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-amber px-4 text-[15px] font-bold text-brand-navy hover:bg-amber-400 transition-colors"
                  >
                    Call
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={mailtoHref}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy px-4 text-[15px] font-bold text-brand-navy hover:bg-gray-50 transition-colors"
                  >
                    Email
                  </a>
                )}
              </>
            ) : (
              <>
                <a
                  href="/join/client"
                  className="inline-flex min-h-[48px] flex-[2] items-center justify-center rounded-xl bg-brand-amber px-4 text-[15px] font-bold text-brand-navy hover:bg-amber-400 transition-colors"
                >
                  Sign up free to get in touch
                </a>
                <a
                  href="/sign-in"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border-2 border-brand-navy px-4 text-[15px] font-bold text-brand-navy hover:bg-gray-50 transition-colors"
                >
                  Sign in
                </a>
              </>
            )}
          </div>
        </div>
      )}

    </>
  )
}

// ── Sub-components ────────────────────────────────────────────

function Stars({ rating, size }: { rating: number; size: 'base' | 'lg' }) {
  const filled = Math.round(rating)
  const cls = size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <div className={`flex ${cls}`} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>
          ★
        </span>
      ))}
    </div>
  )
}

function SubScoreRow({ label, score }: { label: string; score: number }) {
  const filled = Math.round(score)
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        <div className="flex text-xs">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>
              ★
            </span>
          ))}
        </div>
        <span className="w-6 text-right text-xs font-medium tabular-nums text-gray-700">
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

function TrustTick({ children, amber = false }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <li className="flex items-center gap-2.5 text-sm font-medium text-brand-navy">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${amber ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
        ✓
      </span>
      {children}
    </li>
  )
}

// ── Formatters ────────────────────────────────────────────────

function fmtMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function memberSinceYear(iso: string): number {
  return new Date(iso).getFullYear()
}
