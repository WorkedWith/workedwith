import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export type ProfileActivity = { views30: number; views90: number; emails30: number; emails90: number }

/** Profile views and Email now clicks, last 30 and 90 days, for every trade (PRD 3). */
export async function getProfileActivity(admin: AdminClient, tradeProfileId: string): Promise<ProfileActivity> {
  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const d90 = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const count = async (table: 'profile_views' | 'profile_contact_clicks', col: string, since: string) => {
    const q = admin.from(table).select('id', { count: 'exact', head: true }).eq('trade_profile_id', tradeProfileId).gte(col, since)
    const { count: c } = table === 'profile_contact_clicks' ? await q.eq('kind', 'email_now') : await q
    return c ?? 0
  }
  const [views30, views90, emails30, emails90] = await Promise.all([
    count('profile_views', 'viewed_at', d30), count('profile_views', 'viewed_at', d90),
    count('profile_contact_clicks', 'created_at', d30), count('profile_contact_clicks', 'created_at', d90),
  ])
  return { views30, views90, emails30, emails90 }
}

/** Paid WorkedWith jobs, for the trust signals on cards and profiles (PRD 15). */
export async function paidJobCounts(admin: AdminClient, tradeUserIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (tradeUserIds.length === 0) return out
  const { data } = await admin.from('jobs').select('trade_user_id').eq('flow', 'quote').eq('status', 'paid').in('trade_user_id', tradeUserIds)
  for (const j of data ?? []) out.set(j.trade_user_id as string, (out.get(j.trade_user_id as string) ?? 0) + 1)
  return out
}
