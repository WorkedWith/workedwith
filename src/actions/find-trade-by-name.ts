'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type PickedTrade = {
  slug: string
  name: string
  trades: string[]
  areas: string[]
}

export type FindTradeResult =
  | { success: true; trades: PickedTrade[] }
  | { success: false; error: string }

const MAX_SEARCHES_PER_HOUR = 40
const DISTRICT_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/

/** Escapes characters that mean something in a like pattern or in a PostgREST filter. */
function safeTerm(raw: string): string {
  return raw.replace(/[%_\\,()"']/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * A signed in, phone verified client looks for a trade that is already on WorkedWith, by business
 * name and optionally the district. Returns only what the public profile already shows.
 */
export async function findTradeByName(input: { query: string; district?: string }): Promise<FindTradeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sign in to search.' }

  const term = safeTerm(input.query)
  if (term.length < 3) return { success: false, error: 'Type at least 3 letters of the business name.' }
  if (term.length > 60) return { success: false, error: 'That is too long. Try a shorter part of the name.' }

  const district = (input.district ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (district && !DISTRICT_RE.test(district)) {
    return { success: false, error: 'Enter the first part of the postcode, for example M20, or leave it blank.' }
  }

  const admin = createAdminClient()

  const { data: me } = await admin.from('users').select('phone_verified').eq('id', user.id).single()
  if (!me?.phone_verified) return { success: false, error: 'Verify your phone number first.' }

  // Stops people scraping the directory one letter at a time
  const key = `trade_pick:${user.id}`
  const since = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await admin.from('rate_limit_events').select('id', { count: 'exact', head: true }).eq('key', key).gte('created_at', since)
  if ((count ?? 0) >= MAX_SEARCHES_PER_HOUR) {
    return { success: false, error: 'You have searched a lot in the last hour. Please try again later.' }
  }
  await admin.from('rate_limit_events').insert({ key })

  // Business name matches, then personal name matches for sole traders with no business name
  const byCompany = admin
    .from('trade_profiles')
    .select('user_id, company_name, trade_types, operating_areas, public_slug, job_link_paused')
    .ilike('company_name', `%${term}%`)
    .limit(30)
  const byPerson = admin.from('users').select('id').ilike('full_name', `%${term}%`).limit(30)
  const [{ data: companyRows }, { data: personRows }] = await Promise.all([byCompany, byPerson])

  const personIds = ((personRows ?? []) as unknown as { id: string }[]).map(p => p.id)
  let soleRows: typeof companyRows = []
  if (personIds.length > 0) {
    const { data } = await admin
      .from('trade_profiles')
      .select('user_id, company_name, trade_types, operating_areas, public_slug, job_link_paused')
      .in('user_id', personIds)
      .is('company_name', null)
    soleRows = data
  }

  type Row = { user_id: string; company_name: string | null; trade_types: string[] | null; operating_areas: string[] | null; public_slug: string; job_link_paused: boolean | null }
  const merged = new Map<string, Row>()
  for (const r of [...(companyRows ?? []), ...(soleRows ?? [])] as unknown as Row[]) merged.set(r.user_id, r)

  let rows = Array.from(merged.values()).filter(r => !r.job_link_paused && r.user_id !== user.id)
  if (district) rows = rows.filter(r => (r.operating_areas ?? []).includes(district))
  rows = rows.slice(0, 8)

  if (rows.length === 0) return { success: true, trades: [] }

  const { data: names } = await admin.from('users').select('id, full_name').in('id', rows.map(r => r.user_id))
  const nameOf = new Map(((names ?? []) as unknown as { id: string; full_name: string }[]).map(n => [n.id, n.full_name]))

  return {
    success: true,
    trades: rows.map(r => ({
      slug: r.public_slug,
      name: r.company_name ?? nameOf.get(r.user_id) ?? 'Tradesperson',
      trades: (r.trade_types ?? []).slice(0, 3),
      areas: (r.operating_areas ?? []).slice(0, 4),
    })),
  }
}
