'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { VerificationTier } from '@/types/database'

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i

// ── Haversine distance in miles ───────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── postcodes.io response types ───────────────────────────────

type PostcodeResult = {
  postcode: string
  latitude: number | null
  longitude: number | null
}

type SingleResponse = {
  status: number
  result: PostcodeResult | null
}

type BulkItem = {
  query: string
  result: PostcodeResult | null
}

type BulkResponse = {
  status: number
  result: BulkItem[]
}

// ── Public types ──────────────────────────────────────────────

export type TradesearchResult = {
  id: string
  user_id: string
  full_name: string
  trade_types: string[]
  postcode: string
  public_slug: string
  average_rating: number
  total_reviews: number
  total_jobs: number
  verification_tier: VerificationTier
  distance: number
}

export type SearchTradesResult =
  | { success: true; results: TradesearchResult[] }
  | { success: false; error: string }

// ── Action ────────────────────────────────────────────────────

export async function searchTradespeople(
  tradeType: string,
  postcode: string,
  radiusMiles: number,
): Promise<SearchTradesResult> {
  if (!tradeType.trim()) {
    return { success: false, error: 'Please select a trade type.' }
  }

  const clean = postcode.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!UK_POSTCODE_RE.test(clean)) {
    return { success: false, error: 'Please enter a valid UK postcode.' }
  }

  // 1. Geocode the searched postcode
  let searchLat: number
  let searchLon: number
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`,
      { cache: 'no-store' },
    )
    if (!res.ok) {
      return { success: false, error: 'Could not look up that postcode. Please check and try again.' }
    }
    const data = (await res.json()) as SingleResponse
    if (!data.result || data.result.latitude === null || data.result.longitude === null) {
      return { success: false, error: 'Postcode not found. Please check and try again.' }
    }
    searchLat = data.result.latitude
    searchLon = data.result.longitude
  } catch {
    return { success: false, error: 'Could not reach the postcode lookup service. Please try again.' }
  }

  // 2. Fetch searchable trade profiles for this trade type
  const admin = createAdminClient()
  const { data: rawProfiles } = await admin
    .from('trade_profiles')
    .select('id, user_id, trade_types, postcode, public_slug, average_rating, total_reviews, total_jobs')
    .eq('is_searchable', true)
    .contains('trade_types', [tradeType])

  if (!rawProfiles || rawProfiles.length === 0) {
    return { success: true, results: [] }
  }

  // 3. Batch-geocode all unique trade postcodes (postcodes.io: up to 100 per request)
  const uniquePostcodes = Array.from(new Set(rawProfiles.map(p => (p.postcode as string).toUpperCase())))
  const coordsMap = new Map<string, { lat: number; lon: number }>()

  const BATCH = 100
  for (let i = 0; i < uniquePostcodes.length; i += BATCH) {
    const batch = uniquePostcodes.slice(i, i + BATCH)
    try {
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes: batch }),
        cache: 'no-store',
      })
      if (res.ok) {
        const data = (await res.json()) as BulkResponse
        for (const item of data.result) {
          if (item.result && item.result.latitude !== null && item.result.longitude !== null) {
            coordsMap.set(item.query.toUpperCase().replace(/\s+/g, ' '), {
              lat: item.result.latitude,
              lon: item.result.longitude,
            })
          }
        }
      }
    } catch {
      // Partial failure — continue with what we have
    }
  }

  // 4. Fetch user details for all profiles in one query
  const userIds = rawProfiles.map(p => p.user_id as string)
  const { data: rawUsers } = await admin
    .from('users')
    .select('id, full_name, verification_tier')
    .in('id', userIds)

  const userMap = new Map(
    (rawUsers ?? []).map(u => [u.id as string, u])
  )

  // 5. Filter by radius, join user data, build results
  const results: TradesearchResult[] = []

  for (const profile of rawProfiles) {
    const tradePostcode = (profile.postcode as string).toUpperCase().replace(/\s+/g, ' ')
    const coords = coordsMap.get(tradePostcode)
    if (!coords) continue

    const distance = haversine(searchLat, searchLon, coords.lat, coords.lon)
    if (distance > radiusMiles) continue

    const user = userMap.get(profile.user_id as string)
    if (!user) continue

    results.push({
      id: profile.id as string,
      user_id: profile.user_id as string,
      full_name: user.full_name as string,
      trade_types: profile.trade_types as string[],
      postcode: profile.postcode as string,
      public_slug: profile.public_slug as string,
      average_rating: (profile.average_rating as number) ?? 0,
      total_reviews: (profile.total_reviews as number) ?? 0,
      total_jobs: (profile.total_jobs as number) ?? 0,
      verification_tier: user.verification_tier as VerificationTier,
      distance,
    })
  }

  // 6. Sort: rating desc, then review count desc; cap at 20
  results.sort((a, b) =>
    b.average_rating !== a.average_rating
      ? b.average_rating - a.average_rating
      : b.total_reviews - a.total_reviews
  )

  return { success: true, results: results.slice(0, 20) }
}
