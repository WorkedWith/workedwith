'use server'

import { headers } from 'next/headers'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PER_VISITOR_PER_DAY = 15

/**
 * Count an Email now tap and hand back the address parts (PRD 15). Rate limited per visitor so the
 * button can't be used to harvest addresses. The address is only ever put together in the browser.
 */
export async function emailNowTap(target: { tradeProfileId?: string; seededProfileId?: string }): Promise<{ ok: true; user: string; domain: string } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const ip = (headers().get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const key = `email_now:${createHash('sha256').update(ip).digest('hex').slice(0, 32)}`
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await admin.from('rate_limit_events').select('id', { count: 'exact', head: true }).eq('key', key).gte('created_at', since)
  if ((count ?? 0) >= PER_VISITOR_PER_DAY) return { ok: false, error: 'Please try again tomorrow.' }
  await admin.from('rate_limit_events').insert({ key })

  let email: string | null = null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (target.tradeProfileId && UUID_RE.test(target.tradeProfileId)) {
    const { data } = await admin.from('trade_profiles').select('user_id, business_email').eq('id', target.tradeProfileId).maybeSingle()
    email = (data?.business_email as string | null) ?? null
    if (email && data?.user_id !== user?.id) await admin.from('profile_contact_clicks').insert({ trade_profile_id: target.tradeProfileId, kind: 'email_now', viewer_role: user ? 'member' : 'logged_out' })
  } else if (target.seededProfileId && UUID_RE.test(target.seededProfileId)) {
    const { data } = await admin.from('seeded_profiles').select('contact_email, status').eq('id', target.seededProfileId).maybeSingle()
    email = data?.status === 'unclaimed' ? ((data?.contact_email as string | null) ?? null) : null
    if (email) await admin.from('profile_contact_clicks').insert({ seeded_profile_id: target.seededProfileId, kind: 'email_now', viewer_role: user ? 'member' : 'logged_out' })
  }
  if (!email || !email.includes('@')) return { ok: false, error: 'No email address is listed.' }
  const [u, d] = email.split('@')
  return { ok: true, user: u, domain: d }
}
