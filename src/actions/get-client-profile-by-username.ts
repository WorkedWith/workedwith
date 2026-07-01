'use server'

import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import type { ClientProfileResult } from './get-client-profile'
import type { VerificationTier } from '@/types/database'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

type ClientProfileRow = {
  id: string
  user_id: string
  average_rating: number
  total_reviews: number
  payment_reliability_score: number
  communication_score: number
  scope_clarity_score: number
  red_flag_count: number
}

export async function getClientProfileByUsername(username: string): Promise<ClientProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'unauthorized' }

  const admin = createAdminClient()
  const { data: userData } = await admin
    .from('users')
    .select('id, phone_verified, user_type')
    .eq('id', user.id)
    .single()

  if (!userData || !userData.phone_verified) return { status: 'unverified' }
  if (userData.user_type !== 'trade' && userData.user_type !== 'both') {
    return { status: 'unauthorized' }
  }

  const tier = await getUserTier(user.id)
  const isFullAccess = isStandardOrAbove(tier)

  const h = headers()
  const ip = h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? null
  const identifierHash = sha256(username.trim().toLowerCase())

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

  // 1. Search client_profiles.display_name (case insensitive, exact match)
  let foundUserId: string | null = null

  const { data: cpMatch } = await admin
    .from('client_profiles')
    .select('user_id')
    .ilike('display_name', username.trim())
    .maybeSingle()

  if (cpMatch?.user_id) {
    foundUserId = cpMatch.user_id as string
  } else {
    // 2. Fallback: search users.full_name (case insensitive, exact match)
    const { data: userMatch } = await admin
      .from('users')
      .select('id')
      .ilike('full_name', username.trim())
      .maybeSingle()

    if (userMatch?.id) {
      foundUserId = userMatch.id as string
    }
  }

  let clientProfile: ClientProfileRow | null = null
  let foundUserRecord: { created_at: string; verification_tier: string } | null = null

  if (foundUserId) {
    const [{ data: userRow }, { data: cp }] = await Promise.all([
      admin.from('users').select('created_at, verification_tier').eq('id', foundUserId).single(),
      admin
        .from('client_profiles')
        .select('id, user_id, average_rating, total_reviews, payment_reliability_score, communication_score, scope_clarity_score, red_flag_count')
        .eq('user_id', foundUserId)
        .maybeSingle(),
    ])

    if (userRow) {
      foundUserRecord = {
        created_at: userRow.created_at as string,
        verification_tier: userRow.verification_tier as string,
      }
    }

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

  if (!isFullAccess) {
    return {
      status: 'free',
      overall_rating: clientProfile.average_rating,
      total_reviews: clientProfile.total_reviews,
      verification_tier: verTier,
      member_since: foundUserRecord.created_at,
    }
  }

  // Standard / Pro: full data including last 5 written reviews
  const { data: reviews } = await admin
    .from('reviews')
    .select('reviewer_id, overall_rating, written_review, submitted_at')
    .eq('reviewee_id', foundUserId)
    .eq('reviewee_type', 'client')
    .eq('is_visible', true)
    .order('submitted_at', { ascending: false })
    .limit(5)

  const recentReviews = reviews ?? []
  const reviewerIds = recentReviews.map(r => r.reviewer_id as string)
  const tradeTypeMap: Record<string, string> = {}

  if (reviewerIds.length > 0) {
    const { data: tps } = await admin
      .from('trade_profiles')
      .select('user_id, trade_types')
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
