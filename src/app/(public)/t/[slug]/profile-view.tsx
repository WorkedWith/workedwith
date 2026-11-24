import { getActiveInsurance, coverLabel, monthYear, INSURANCE_TOOLTIP } from '@/lib/insurance'
import { ReviewResponse } from '@/components/review-response'
import { TrackedContactLink } from '@/components/tracked-contact-link'
import { EmailNowButton } from '@/components/email-now-button'
import { paidJobCounts } from '@/lib/profile-activity'
import { logProfileViewFromSearch } from '@/actions/log-search-outcome'
import { getOutcomeLabels, endedEarlyLabel } from '@/lib/job-outcome'
import { confirmationLabel, CONFIRMATION_TOOLTIP_TRADE } from '@/lib/request-outcomes'
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
import { GallerySection } from '@/components/gallery-section'
import { OwnerPhotosPanel } from '@/components/owner-photos-panel'
import { TradeIcon } from '@/components/trade-icon'
import { getGalleryImages } from '@/actions/gallery/get-gallery-images'

function SeededProfilePage({ profile }: { profile: SeededProfile; slug: string; signedIn: boolean }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 pb-8 pt-10 sm:px-6">
        <div className="mx-auto max-w-2xl">
          {/* "Not yet on WorkedWith" — prominent, always visible */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/80 ring-1 ring-white/20">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
            Not yet on WorkedWith. No reviews yet.
          </div>

          <h1 className="text-3xl font-bold text-white sm:text-4xl">{profile.business_name}</h1>
          {profile.companies_house_number && profile.companies_house_status && (
            <p className="mt-2 text-sm text-white/70">
              Companies House: {profile.companies_house_status === 'active' ? 'active' : profile.companies_house_status}
              {profile.incorporated_on ? `. Trading since ${new Date(profile.incorporated_on).getFullYear()}` : ''}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {(profile.trade_categories?.length ? profile.trade_categories : [profile.trade_category]).map(t => (
              <span key={t} className="rounded-full bg-brand-amber/20 px-3 py-1 text-sm font-medium text-brand-amber">
                {t}
              </span>
            ))}
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

        {/* Email now to the publicly listed email (PRD 15, 16). Phone numbers are never seeded. */}
        {profile.contact_email && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Contact</h2>
            <EmailNowButton seededProfileId={profile.id} businessName={profile.business_name} profileUrl={`${APP_URL}/t/${profile.slug}`} />
            <p className="mt-2 text-xs text-gray-500">Opens your email app. Your message goes straight to the business, not through WorkedWith.</p>
          </section>
        )}

        {/* Explanation */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
          <p className="text-sm font-semibold text-amber-900">This business has not joined WorkedWith yet</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700">
            This listing was made from public information to help clients find local trades. It has no reviews,
            because every review on WorkedWith comes from a paid job run through WorkedWith.
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

export async function TradeProfileView({ slug, preview = false, searchId = null }: { slug: string; preview?: boolean; searchId?: string | null }) {
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
      // Seeded views feed the activity figures in claim reminder emails (PRD 16)
      if (!preview) admin.from('seeded_profile_views').insert({ seeded_profile_id: rawSeeded.id as string }).then(() => {})
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

  const hiredAgain = (tradeProfile.hired_again_count as number | null) ?? 0
  // v3.7 confirmation rate is superseded by quotes (PRD 23); kept hidden
  const confLabel: string | null = null
  void confirmationLabel

  // 2. Parallel: user row + visible reviews + reviewer activity + featured jobs + current viewer
  const supabase = await createClient()
  const [
    { data: tradeUser },
    { data: reviews },
    { data: reviewerActivity },
    featuredJobsAll,
    galleryImages,
    { count: ownGalleryCount },
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
    getGalleryImages(tradeProfileId),
    admin
      .from('profile_gallery_images')
      .select('id', { count: 'exact', head: true })
      .eq('trade_profile_id', tradeProfileId)
      .neq('moderation_status', 'rejected'),
    supabase.auth.getUser(),
  ])

  const featuredJobs = featuredJobsAll
  const isOwner = currentUser?.id === userId

  // Fire-and-forget view log
  if (!preview) {
    admin.from('profile_views').insert({
      trade_profile_id: tradeProfileId,
      viewer_id: currentUser?.id ?? null,
      source: 'direct',
    }).then(() => {})
    if (searchId) void logProfileViewFromSearch(tradeProfileId, userId, searchId)
  }

  if (!tradeUser) notFound()

  const verTier = tradeUser.verification_tier as VerificationTier
  const displayName = (tradeProfile.company_name as string | null) ?? tradeUser.full_name as string
  const reviewList = reviews ?? []
  const outcomeLabels = await getOutcomeLabels(admin, reviewList.map(r => r.job_id as string))
  const insurance = (await getActiveInsurance(admin, [tradeProfileId])).get(tradeProfileId) ?? null
  // v3.9 ended early is replaced by cancellation after start (PRD 23); kept hidden
  const endedLabel: string | null = null
  void endedEarlyLabel
  const paidJobs = (await paidJobCounts(admin, [userId])).get(userId) ?? 0
  const reviewsClients = (reviewerActivity?.length ?? 0) > 0
  const profileUrl = `${APP_URL}/t/${slug}`
  // Contact details are only sent to signed in viewers
  // The phone is shown to signed in members only; the business email is public via Email now (PRD 15)
  const contactPhone = currentUser ? ((tradeProfile.business_phone as string | null) ?? (tradeUser.phone_verified && typeof tradeUser.phone === 'string' ? tradeUser.phone : null)) : null
  const businessEmail = (tradeProfile.business_email as string | null) ?? null
  const mainTrades = tradeTypes.filter(t => !ALL_SPECIALISMS.includes(t))
  const specialisms = tradeTypes.filter(t => ALL_SPECIALISMS.includes(t))
  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: displayName,
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
                tradeIcon={mainTrades[0] ?? tradeTypes[0] ?? null}
              />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-white sm:text-3xl">{displayName}</h1>
                <p className="mt-1 text-sm text-white/60">
                  Member since {memberSinceYear(tradeUser.created_at as string)}
                </p>
                {verTier === 'fully_verified' && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-300">
                    ✓ ID verified
                  </span>
                )}
              </div>
            </div>

            {mainTrades.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {mainTrades.slice(0, 3).map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-brand-amber/20 px-3 py-1 text-sm font-semibold text-brand-amber">
                    <TradeIcon trade={t} className="h-4 w-4" />
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

        <div className={`mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-4 ${!isOwner && !preview ? 'pb-32' : ''}`}>

          {/* ── Trust card ───────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {(tradeProfile.total_reviews as number) > 0 ? (
              <div className="flex items-center gap-5">
                <div className="shrink-0 text-center">
                  <p className="text-4xl font-bold leading-none text-brand-navy">
                    {(tradeProfile.average_rating as number).toFixed(1)}
                  </p>
                  <div className="mt-1.5"><Stars rating={tradeProfile.average_rating as number} size="lg" /></div>
                </div>
                <div className="text-sm leading-relaxed text-gray-600">
                  <p>
                    <span className="font-semibold text-brand-navy">{tradeProfile.total_reviews as number}</span>{' '}
                    review{(tradeProfile.total_reviews as number) !== 1 ? 's' : ''}, each tied to a paid job
                  </p>
                  {paidJobs > 0 && (
                    <p>
                      <span className="font-semibold text-brand-navy">{paidJobs}</span>{' '}
                      paid job{paidJobs !== 1 ? 's' : ''} on WorkedWith
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Reviews</p>
                <h2 className="mt-1 text-lg font-bold text-brand-navy">New on WorkedWith</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {displayName} has no reviews yet because they have only just joined. On WorkedWith, every review
                  comes from a real job that both sides agreed took place.
                </p>
                <ol className="mt-4 space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">1</span>
                    <span>The tradesperson logs the job and the client confirms it.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">2</span>
                    <span>When the work is done, each side reviews the other without seeing what the other wrote.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">3</span>
                    <span>Both reviews go live together, so neither side can write back in revenge.</span>
                  </li>
                </ol>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  Their first reviews will appear here after their first confirmed jobs. Until then, the checks
                  below show what we have checked.
                </p>
              </div>
            )}
            {((verTier === 'phone_verified' || verTier === 'fully_verified') || confLabel || hiredAgain > 0 || endedLabel || insurance) && (
              <ul className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
                {(verTier === 'phone_verified' || verTier === 'fully_verified') && (
                  <TrustTick>Phone number checked</TrustTick>
                )}
                {verTier === 'fully_verified' && <TrustTick title="WorkedWith has checked their photo ID and a live selfie.">ID checked</TrustTick>}
                {insurance && (
                  <TrustTick title={INSURANCE_TOOLTIP}>
                    Insured to {coverLabel(insurance.cover_amount_gbp)} until {monthYear(insurance.expires_on)}
                  </TrustTick>
                )}
                {hiredAgain > 0 && (
                  <TrustTick title="Clients who have hired this trade for more than one job, at least two weeks apart.">
                    Hired again by {hiredAgain} client{hiredAgain === 1 ? '' : 's'}
                  </TrustTick>
                )}
                {endedLabel && (
                  <li title="Jobs that one side marked as ended early, out of all confirmed jobs." className="flex items-center gap-2.5 text-sm font-medium text-brand-navy">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600" aria-hidden>!</span>
                    {endedLabel}
                  </li>
                )}
                {confLabel && (
                  <li title={CONFIRMATION_TOOLTIP_TRADE} className="flex items-center gap-2.5 text-sm font-medium text-brand-navy">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600" aria-hidden>↻</span>
                    {confLabel}
                  </li>
                )}
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
                      <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy/10 px-2.5 py-1 text-xs font-semibold text-brand-navy">
                        <TradeIcon trade={t} className="h-3.5 w-3.5" />
                        {t}
                      </span>
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
                          Confirmed client
                        </span>
                        {outcomeLabels.get(review.job_id as string) && (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            {outcomeLabels.get(review.job_id as string)}
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

                      <ReviewResponse
                        reviewId={rid}
                        responseText={(review.response_text as string | null) ?? null}
                        responderName={displayName}
                        canRespond={isOwner}
                      />
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Photos ───────────────────────────────────────── */}
          {isOwner && <OwnerPhotosPanel galleryCount={ownGalleryCount ?? 0} />}
          <GallerySection images={galleryImages} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} />

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
      {!isOwner && (businessEmail || contactPhone || !currentUser) && (
        <div className={preview ? 'mx-auto max-w-2xl px-4 pb-6 sm:px-6' : `fixed inset-x-0 ${currentUser ? 'bottom-14 sm:bottom-0' : 'bottom-0'} z-30 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(15,31,61,0.08)]`}>
          <div className={preview ? 'flex gap-3' : 'mx-auto flex max-w-2xl items-start gap-3 px-4 pb-5 pt-3 sm:px-6'}>
            {businessEmail && <EmailNowButton tradeProfileId={tradeProfileId} businessName={displayName} profileUrl={profileUrl} />}
            {contactPhone ? (
              <TrackedContactLink
                href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                kind="call"
                tradeProfileId={tradeProfileId}
                searchId={searchId}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-brand-navy px-4 text-[15px] font-bold text-brand-navy hover:bg-gray-50"
              >
                Call
              </TrackedContactLink>
            ) : !currentUser ? (
              <a href={`/sign-in?next=/t/${slug}`} className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border-2 border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-gray-50">
                Sign in to see their phone
              </a>
            ) : null}
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

function TrustTick({ children, amber = false, title }: { children: React.ReactNode; amber?: boolean; title?: string }) {
  return (
    <li title={title} className="flex items-center gap-2.5 text-sm font-medium text-brand-navy">
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
