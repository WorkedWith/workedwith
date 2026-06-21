'use server'

import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import type { VerificationTier } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type RecentReview = {
  overall_rating: number | null
  written_review: string | null
  submitted_at: string
  reviewer_trade_type: string
}

export type ClientProfileResult =
  | { status: 'not_found' }
  | { status: 'rate_limited' }
  | { status: 'unauthorized' }
  | { status: 'unverified' }
  | {
      status: 'free'
      overall_rating: number
      total_reviews: number
      verification_tier: VerificationTier
      member_since: string
    }
  | {
      status: 'pro'
      overall_rating: number
      total_reviews: number
      verification_tier: VerificationTier
      member_since: string
      payment_reliability_score: number
      communication_score: number
      scope_clarity_score: number
      red_flag_count: number
      recent_reviews: RecentReview[]
    }

// ── Helpers ───────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeUKMobile(raw: string): string | null {
  const c = raw.replace(/[\s\-().]/g, '')
  if (/^\+447\d{9}$/.test(c)) return c
  if (/^07\d{9}$/.test(c)) return '+44' + c.slice(1)
  return null
}

// ── Action ────────────────────────────────────────────────────

export async function getClientProfile(identifier: string): Promise<ClientProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'unauthorized' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || !userData.phone_verified) return { status: 'unverified' }
  if (userData.user_type !== 'trade' && userData.user_type !== 'both') {
    return { status: 'unauthorized' }
  }

  const tier = await getUserTier(user.id)
  const isPro = isStandardOrAbove(tier)

  // IP address for audit log (synchronous in Next.js 14)
  const h = headers()
  const ip = h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? null

  // Identifier hash for audit log — never store raw PII
  const identifierHash = sha256(identifier.trim().toLowerCase())

  // Rate limit: max 20 searches per 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentSearches } = await admin
    .from('search_audit_log')
    .select('id')
    .eq('searcher_id', user.id)
    .gte('searched_at', since)
    .limit(21)

  if ((recentSearches?.length ?? 0) >= 20) {
    await admin.from('search_audit_log').insert({
      searcher_id: user.id,
      identifier_hash: identifierHash,
      result: 'rate_limited',
      ip_address: ip,
    })
    return { status: 'rate_limited' }
  }

  // Look up user by email or normalised phone
  const cleaned = identifier.trim()
  const isEmail = EMAIL_RE.test(cleaned)
  let foundUserId: string | null = null

  if (isEmail) {
    const { data } = await admin
      .from('users')
      .select('id')
      .eq('email', cleaned.toLowerCase())
      .maybeSingle()
    foundUserId = data?.id ?? null
  } else {
    const normalizedPhone = normalizeUKMobile(cleaned)
    if (normalizedPhone) {
      const { data } = await admin
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle()
      foundUserId = data?.id ?? null
    }
  }

  // Fetch client profile (need both user and profile to return a result)
  let clientProfile: { id: string; user_id: string; average_rating: number; total_reviews: number; payment_reliability_score: number; communication_score: number; scope_clarity_score: number; red_flag_count: number } | null = null
  let foundUserRecord: { created_at: string; verification_tier: string } | null = null

  if (foundUserId) {
    const [{ data: userRow }, { data: cp }] = await Promise.all([
      admin.from('users').select('created_at, verification_tier').eq('id', foundUserId).single(),
      admin.from('client_profiles').select('id, user_id, average_rating, total_reviews, payment_reliability_score, communication_score, scope_clarity_score, red_flag_count').eq('user_id', foundUserId).maybeSingle(),
    ])
    if (userRow) foundUserRecord = { created_at: userRow.created_at as string, verification_tier: userRow.verification_tier as string }
    if (cp) {
      clientProfile = {
        id: cp.id as string,
        user_id: cp.user_id as string,
        average_rating: cp.average_rating as number,
        total_reviews: cp.total_reviews as number,
        payment_reliability_score: cp.payment_reliability_score as number,
        communication_score: cp.communication_score as number,
        scope_clarity_score: cp.scope_clarity_score as number,
        red_flag_count: cp.red_flag_count as number,
      }
    }
  }

  const matched = foundUserId !== null && clientProfile !== null && foundUserRecord !== null
  const auditResult = matched ? 'match_found' : 'no_match'

  await admin.from('search_audit_log').insert({
    searcher_id: user.id,
    identifier_hash: identifierHash,
    result: auditResult,
    ip_address: ip,
  })

  if (!matched || !clientProfile || !foundUserRecord || !foundUserId) {
    return { status: 'not_found' }
  }

  const verTier = foundUserRecord.verification_tier as VerificationTier

  // Free tier — limited data only
  if (!isPro) {
    return {
      status: 'free',
      overall_rating: clientProfile.average_rating,
      total_reviews: clientProfile.total_reviews,
      verification_tier: verTier,
      member_since: foundUserRecord.created_at,
    }
  }

  // Pro tier — full data including last 5 written reviews
  const { data: reviews } = await admin
    .from('reviews')
    .select('*')
    .eq('reviewee_id', foundUserId)
    .eq('reviewee_type', 'client')
    .eq('is_visible', true)
    .order('submitted_at', { ascending: false })
    .limit(5)

  const recentReviews = reviews ?? []

  // Fetch reviewer trade types in one query
  const reviewerIds = recentReviews.map(r => r.reviewer_id as string)
  const tradeTypeMap: Record<string, string> = {}

  if (reviewerIds.length > 0) {
    const { data: tps } = await admin
      .from('trade_profiles')
      .select('*')
      .in('user_id', reviewerIds)

    tps?.forEach(tp => {
      const types = tp.trade_types as string[]
      tradeTypeMap[tp.user_id as string] = types[0] ?? 'Tradesperson'
    })
  }

  return {
    status: 'pro',
    overall_rating: clientProfile.average_rating,
    total_reviews: clientProfile.total_reviews,
    verification_tier: verTier,
    member_since: foundUserRecord.created_at,
    payment_reliability_score: clientProfile.payment_reliability_score,
    communication_score: clientProfile.communication_score,
    scope_clarity_score: clientProfile.scope_clarity_score,
    red_flag_count: clientProfile.red_flag_count,
    recent_reviews: recentReviews.map(r => ({
      overall_rating: r.overall_rating as number | null,
      written_review: r.written_review as string | null,
      submitted_at: r.submitted_at as string,
      reviewer_trade_type: tradeTypeMap[r.reviewer_id as string] ?? 'Tradesperson',
    })),
  }
}
