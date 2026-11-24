import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

const avg = (vals: (number | null | undefined)[]) => {
  const n = vals.filter((v): v is number => typeof v === 'number')
  return n.length ? Math.round((n.reduce((s, v) => s + v, 0) / n.length) * 10) / 10 : 0
}

/** Rebuild the cached scores from published reviews (same calculation as the existing flow). */
export async function refreshScores(admin: AdminClient, revieweeId: string, type: 'trade' | 'client'): Promise<void> {
  const { data } = await admin.from('reviews').select('overall_rating, payment_score, communication_score, scope_clarity_score, red_flag').eq('reviewee_id', revieweeId).eq('reviewee_type', type).eq('is_visible', true)
  const rows = data ?? []
  if (type === 'trade') {
    await admin.from('trade_profiles').update({ average_rating: avg(rows.map(r => r.overall_rating as number | null)), total_reviews: rows.length }).eq('user_id', revieweeId)
  } else {
    await admin.from('client_profiles').update({
      average_rating: avg(rows.map(r => r.overall_rating as number | null)),
      total_reviews: rows.length,
      payment_reliability_score: avg(rows.map(r => r.payment_score as number | null)),
      communication_score: avg(rows.map(r => r.communication_score as number | null)),
      scope_clarity_score: avg(rows.map(r => r.scope_clarity_score as number | null)),
      red_flag_count: rows.filter(r => r.red_flag).length,
    }).eq('user_id', revieweeId)
  }
}
