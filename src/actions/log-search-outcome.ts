'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sessionHashForToday } from '@/lib/search-analytics'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Records that a contact button was tapped on a trade profile. Never fails the tap. */
export async function logContactClick(tradeProfileId: string, kind: 'call' | 'email', searchId: string | null): Promise<void> {
  try {
    const { isBot } = await sessionHashForToday()
    if (isBot || !UUID_RE.test(tradeProfileId)) return
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminClient()

    const { data: tp } = await admin.from('trade_profiles').select('user_id').eq('id', tradeProfileId).maybeSingle()
    if (!tp || (user && (tp.user_id as string) === user.id)) return // trades testing their own profile don't count

    let role: string | null = null
    if (user) {
      const { data: u } = await admin.from('users').select('user_type, is_admin').eq('id', user.id).maybeSingle()
      if (u?.is_admin) return
      role = (u?.user_type as string | null) === 'trade' ? 'trade' : 'client'
    } else {
      role = 'logged_out'
    }

    let district: string | null = null
    let category: string | null = null
    const sid = searchId && UUID_RE.test(searchId) ? searchId : null
    if (sid) {
      const { data: ev } = await admin.from('search_events').select('district, trade_category').eq('id', sid).maybeSingle()
      district = (ev?.district as string | undefined) ?? null
      category = (ev?.trade_category as string | undefined) ?? null
    }
    await admin.from('search_outcomes').insert({
      kind: 'contact_click', contact_type: kind, trade_profile_id: tradeProfileId,
      search_event_id: sid, district, trade_category: category, viewer_role: role,
    })
  } catch (e) {
    console.error('contact click log failed (non-fatal):', e)
  }
}

/** Records a profile opened from search results. Called from the profile page. */
export async function logProfileViewFromSearch(tradeProfileId: string, tradeOwnerId: string, searchId: string): Promise<void> {
  try {
    if (!UUID_RE.test(searchId)) return
    const { isBot } = await sessionHashForToday()
    if (isBot) return
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id === tradeOwnerId) return
    const admin = createAdminClient()
    const { data: ev } = await admin.from('search_events').select('district, trade_category, viewer_role').eq('id', searchId).maybeSingle()
    if (!ev || ev.viewer_role === 'admin') return
    await admin.from('search_outcomes').insert({
      kind: 'profile_view', trade_profile_id: tradeProfileId, search_event_id: searchId,
      district: ev.district as string, trade_category: ev.trade_category as string, viewer_role: ev.viewer_role as string,
    })
  } catch (e) {
    console.error('profile view log failed (non-fatal):', e)
  }
}
