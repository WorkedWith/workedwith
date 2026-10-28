import { headers } from 'next/headers'
import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parentTrade } from '@/lib/trade-types'

export type ViewerRole = 'logged_out' | 'client' | 'trade' | 'admin'

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|curl|wget|python-requests/i

/** Daily rotating hash so logged out visitors count as unique without storing anything identifying. */
export async function sessionHashForToday(): Promise<{ hash: string; isBot: boolean }> {
  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const ua = h.get('user-agent') ?? ''
  const day = new Date().toISOString().slice(0, 10)
  const salt = process.env.ID_HASH_PEPPER ?? 'workedwith'
  return { hash: createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex').slice(0, 32), isBot: BOT_RE.test(ua) }
}

export function roleFromUserType(isAdmin: boolean, userType: string | null): ViewerRole {
  if (isAdmin) return 'admin'
  if (userType === 'trade') return 'trade'
  // 'both' and any client type count as a client searcher
  return 'client'
}

export function categoryOf(tradeType: string): { category: string; specialism: string | null } {
  const parent = parentTrade(tradeType)
  return parent ? { category: parent, specialism: tradeType } : { category: tradeType, specialism: null }
}

/** Fire and forget. Never throws and never slows a search. */
export async function logSearchEvent(
  admin: SupabaseClient,
  p: { district: string; tradeType: string; userId: string | null; role: ViewerRole; real: number; seeded: number; boosted: number },
): Promise<string | null> {
  try {
    const { hash, isBot } = await sessionHashForToday()
    if (isBot) return null
    const { category, specialism } = categoryOf(p.tradeType)
    const { data } = await admin
      .from('search_events')
      .insert({
        district: p.district, trade_category: category, specialism, viewer_role: p.role,
        user_id: p.userId, session_hash: hash,
        real_count: p.real, seeded_count: p.seeded, boosted_count: p.boosted, demo_shown: p.real + p.seeded === 0,
      })
      .select('id')
      .single()
    return (data as { id: string } | null)?.id ?? null
  } catch (e) {
    console.error('search log failed (non-fatal):', e)
    return null
  }
}
