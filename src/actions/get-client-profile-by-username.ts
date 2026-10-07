'use server'

import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import { DAILY_LOOKUP_LIMIT, classifyIdentifier } from '@/lib/lookup'
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

export async function getClientProfileByIdentifier(rawInput: string): Promise<ClientProfileResult> {
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
  const identifier = classifyIdentifier(rawInput)
  if (!identifier.value) return { status: 'not_found' }
  const identifierHash = sha256(`${identifier.kind}:${identifier.value.toLowerCase()}`)

  // Rate limit: DAILY_LOOKUP_LIMIT lookups per rolling 24 hours (blocked attempts do not count)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentSearches } = await admin
    .from('search_audit_log')
    .select('searched_at')
    .eq('searcher_id', user.id)
    .neq('result', 'rate_limited')
    .gte('searched_at', since)
    .order('searched_at', { ascending: true })
    .limit(DAILY_LOOKUP_LIMIT + 1)

  if ((recentSearches?.length ?? 0) >= DAILY_LOOKUP_LIMIT) {
    await admin.from('search_audit_log').insert({
      searcher_id: user.id,
      identifier_hash: identifierHash,
      result: 'rate_limited',
      ip_address: ip,
    })
    const oldest = recentSearches?.[0]?.searched_at as string | undefined
    const resetsAt = oldest ? new Date(new Date(oldest).getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined
    return { status: 'rate_limited', resets_at: resetsAt }
  }

  // Find the user by exact username, email or UK mobile. Never by real name.
  let foundUserId: string | null = null

  if (identifier.kind === 'email') {
    const { data } = await admin.from('users').select('id').eq('email', identifier.value).maybeSingle()
    if (data?.id) foundUserId = data.id as string
  } else if (identifier.kind === 'phone') {
    const { data } = await admin.from('users').select('id').eq('phone', identifier.value).maybeSingle()
    if (data?.id) foundUserId = data.id as string
  } else {
    const { data } = await admin
      .from('client_profiles')
      .select('user_id')
      .eq('username', identifier.value.replace(/^@/, '').toLowerCase())
      .maybeSingle()
    if (data?.user_id) foundUserId = data.user_id as string
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
