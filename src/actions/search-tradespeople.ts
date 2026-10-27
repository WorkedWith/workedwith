'use server'

import { confirmationLabel } from '@/lib/request-outcomes'
import { getActiveInsurance } from '@/lib/insurance'
import { getEffectiveTiers } from '@/lib/tier'
import { categoryMean, weightedScore, type CategoryAverages } from '@/lib/ranking/weighted'
import { createAdminClient } from '@/lib/supabase/admin'
import { SPECIALISMS } from '@/lib/trade-types'
import type { SubscriptionTier, VerificationTier, SeededProfile } from '@/types/database'

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i

const DENSITY_THRESHOLD = 3

type PostcodeIoResult = {
  outcode: string
}

type SingleResponse = {
  status: number
  result: PostcodeIoResult | null
}

export type TradesearchResult = {
  id: string
  user_id: string
  full_name: string
  photo_url: string | null
  company_name: string | null
  trade_types: string[]
  operating_areas: string[]
  boosted_districts: string[]
  public_slug: string
  average_rating: number
  total_reviews: number
  total_jobs: number
  subscription_tier: SubscriptionTier
  verification_tier: VerificationTier
  confirmation_label: string | null
  hired_again_count: number
  insured: boolean
  is_seeded?: false
}

export type SeededSearchResult = {
  id: string
  business_name: string
  trade_category: string
  trade_categories: string[]
  operating_areas: string[]
  public_slug: string
  is_seeded: true
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export type SearchTradesResult =
  | { success: true; results: TradesearchResult[]; seededResults: SeededSearchResult[]; district: string }
  | { success: false; error: string }

export async function searchTradespeople(
  tradeType: string,
  postcode: string,
): Promise<SearchTradesResult> {
  if (!tradeType.trim()) {
    return { success: false, error: 'Please select a trade type.' }
  }

  const clean = postcode.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!UK_POSTCODE_RE.test(clean)) {
    return { success: false, error: 'Please enter a valid UK postcode.' }
  }

  // Resolve postcode to outward code (district)
  let district: string
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`,
      { cache: 'no-store' },
    )
    if (res.status === 404) {
      return { success: false, error: 'We could not find that postcode. Please check it and try again.' }
    }
    if (!res.ok) {
      return { success: false, error: 'The postcode lookup is not responding right now. Please try again in a moment.' }
    }
    const data = (await res.json()) as SingleResponse
    if (!data.result?.outcode) {
      return { success: false, error: 'Postcode not found. Please check and try again.' }
    }
    district = data.result.outcode.toUpperCase()
  } catch {
    return { success: false, error: 'Could not reach the postcode lookup service. Please try again.' }
  }

  const admin = createAdminClient()

  // Fetch real trade profiles. Every tier appears in search (PRD 5.2/5.3);
  // subscription only affects boosted placement, not whether a trade is listed.
  const { data: rawProfiles } = await admin
    .from('trade_profiles')
    .select('id, user_id, trade_types, company_name, operating_areas, boosted_districts, public_slug, average_rating, total_reviews, total_jobs, subscription_tier, confirmation_counted, confirmation_confirmed, hired_again_count')
    .contains('trade_types', [tradeType])
    .contains('operating_areas', [district])

  // Build real results
  let realResults: TradesearchResult[] = []

  if (rawProfiles && rawProfiles.length > 0) {
    const userIds = rawProfiles.map(p => p.user_id as string)
    const effectiveTiers = await getEffectiveTiers(
      admin,
      rawProfiles.map(p => ({ user_id: p.user_id as string, subscription_tier: p.subscription_tier as string | null })),
    )
    const { data: rawUsers } = await admin
      .from('users')
      .select('id, full_name, verification_tier, profile_photo_url')
      .in('id', userIds)

    const userMap = new Map(
      (rawUsers ?? []).map(u => [u.id as string, u])
    )

    const insuredIds = new Set((await getActiveInsurance(admin, rawProfiles.map(p => p.id as string))).keys())

    for (const profile of rawProfiles) {
      const user = userMap.get(profile.user_id as string)
      if (!user) continue
      realResults.push({
        id: profile.id as string,
        user_id: profile.user_id as string,
        full_name: user.full_name as string,
        photo_url: (user.profile_photo_url as string | null) ?? null,
        company_name: (profile.company_name as string | null) ?? null,
        trade_types: profile.trade_types as string[],
        operating_areas: (profile.operating_areas as string[]) ?? [],
        boosted_districts: (profile.boosted_districts as string[]) ?? [],
        public_slug: profile.public_slug as string,
        average_rating: (profile.average_rating as number) ?? 0,
        total_reviews: (profile.total_reviews as number) ?? 0,
        total_jobs: (profile.total_jobs as number) ?? 0,
        subscription_tier: effectiveTiers.get(profile.user_id as string) ?? 'free',
        verification_tier: user.verification_tier as VerificationTier,
        hired_again_count: (profile.hired_again_count as number | null) ?? 0,
        insured: insuredIds.has(profile.id as string),
        confirmation_label: confirmationLabel(profile.confirmation_counted as number | null, profile.confirmation_confirmed as number | null),
      })
    }

    // Two bands. Boosted Pro first, rotated at random. Everyone else ranked by a confidence
    // weighted score (never shown), so a couple of friendly reviews do not beat a long record.
    const isBoostedHere = (r: TradesearchResult) =>
      r.subscription_tier === 'pro' && r.boosted_districts.includes(district)

    const { data: rawAverages } = await admin.from('category_rating_averages').select('trade_type, avg_rating, review_count')
    const averages: CategoryAverages = new Map(
      ((rawAverages ?? []) as unknown as { trade_type: string; avg_rating: number; review_count: number }[])
        .map(a => [a.trade_type, { avg: Number(a.avg_rating), count: a.review_count }]),
    )
    const m = categoryMean(averages, tradeType)

    const { data: rawJobs } = await admin
      .from('jobs')
      .select('trade_profile_id, confirmed_at')
      .in('trade_profile_id', realResults.map(r => r.id))
      .in('status', ['active', 'completed', 'disputed'])
      .not('confirmed_at', 'is', null)
      .order('confirmed_at', { ascending: false })
      .limit(2000)
    const latestJob = new Map<string, number>()
    for (const j of (rawJobs ?? []) as unknown as { trade_profile_id: string; confirmed_at: string }[]) {
      if (!latestJob.has(j.trade_profile_id)) latestJob.set(j.trade_profile_id, new Date(j.confirmed_at).getTime())
    }

    const score = (r: TradesearchResult) => (r.total_reviews > 0 ? weightedScore(r.average_rating, r.total_reviews, m) : m)
    const standardResults = realResults
      .filter(r => !isBoostedHere(r))
      .sort((a, b) =>
        score(b) - score(a) ||
        b.total_jobs - a.total_jobs ||
        (latestJob.get(b.id) ?? 0) - (latestJob.get(a.id) ?? 0))
    const boostedResults = shuffleArray(realResults.filter(isBoostedHere))
    realResults = [...boostedResults, ...standardResults].slice(0, 20)
  }

  // Fire-and-forget search appearance log for real results
  if (realResults.length > 0) {
    admin.from('search_appearances').insert(
      realResults.map(r => ({
        trade_profile_id: r.id,
        search_postcode: postcode,
        search_trade_type: tradeType,
      }))
    ).then(() => {})
  }

  // ── Density rule ─────────────────────────────────────────────
  // Seeded profiles only appear when real results < DENSITY_THRESHOLD (3).
  // They never appear above a real result and are capped so real + seeded <= 3.
  let seededResults: SeededSearchResult[] = []

  if (realResults.length < DENSITY_THRESHOLD) {
    const seededSlots = DENSITY_THRESHOLD - realResults.length
    const { data: rawSeeded } = await admin
      .from('seeded_profiles')
      .select('id, slug, business_name, trade_category, trade_categories, operating_areas')
      .eq('status', 'unclaimed')
      .overlaps('trade_categories', [tradeType, ...((SPECIALISMS as Record<string, readonly string[] | undefined>)[tradeType] ?? [])])
      .contains('operating_areas', [district])
      .limit(seededSlots)

    if (rawSeeded && rawSeeded.length > 0) {
      seededResults = (rawSeeded as unknown as SeededProfile[]).map(sp => ({
        id: sp.id,
        business_name: sp.business_name,
        trade_category: sp.trade_category,
        trade_categories: (sp.trade_categories as string[] | null)?.length ? (sp.trade_categories as string[]) : [sp.trade_category],
        operating_areas: sp.operating_areas,
        public_slug: sp.slug,
        is_seeded: true as const,
      }))
    }
  }

  return { success: true, results: realResults, seededResults, district }
}
