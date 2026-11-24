import type { createAdminClient } from '@/lib/supabase/admin'
import { BOOST_SLOTS_PER_TRADE_TYPE } from '@/lib/boost-types'
import { isOnPaidPlan } from '@/lib/plan'
import { notify } from '@/lib/notify'
import { sendEmail } from '@/lib/email/send'
import { boostSlotFree } from '@/lib/email/templates'

type AdminClient = ReturnType<typeof createAdminClient>

/** Trades currently boosting a district (paid plan only), with their trade types. */
async function boostersIn(admin: AdminClient, district: string): Promise<{ user_id: string; trade_types: string[] }[]> {
  const { data } = await admin
    .from('trade_profiles')
    .select('user_id, trade_types, subscription_status, trial_ends_at')
    .contains('boosted_districts', [district])
  return (data ?? [])
    .filter(r => isOnPaidPlan({ subscription_status: r.subscription_status as string, trial_ends_at: r.trial_ends_at as string | null }))
    .map(r => ({ user_id: r.user_id as string, trade_types: (r.trade_types as string[] | null) ?? [] }))
}

/**
 * Up to 3 boosted trades per trade type per district (decision 15). Returns the trade types that are
 * already full for this district, ignoring the trade asking.
 */
export async function fullTradeTypes(admin: AdminClient, district: string, tradeTypes: string[], exceptUserId: string): Promise<string[]> {
  const boosters = (await boostersIn(admin, district)).filter(b => b.user_id !== exceptUserId)
  return tradeTypes.filter(t => boosters.filter(b => b.trade_types.includes(t)).length >= BOOST_SLOTS_PER_TRADE_TYPE)
}

/** When a boost ends, tell the first person waiting for each trade type that now has room. */
export async function notifyWaitlist(admin: AdminClient, district: string): Promise<void> {
  const { data: waiting } = await admin
    .from('boost_waitlist')
    .select('id, user_id, trade_type')
    .eq('district', district)
    .is('removed_at', null)
    .is('notified_at', null)
    .order('created_at', { ascending: true })
  if (!waiting || waiting.length === 0) return

  const boosters = await boostersIn(admin, district)
  const told = new Set<string>()
  for (const w of waiting) {
    const type = w.trade_type as string
    if (told.has(type)) continue
    const used = boosters.filter(b => b.trade_types.includes(type)).length
    if (used >= BOOST_SLOTS_PER_TRADE_TYPE) continue
    told.add(type)
    const now = new Date().toISOString()
    await admin.from('boost_waitlist').update({ notified_at: now }).eq('id', w.id as string)
    await notify(admin, w.user_id as string, {
      type: 'boost_slot_free',
      title: `A boost slot is free in ${district}`,
      body: `A Boosted slot for ${type} in ${district} has come up. Boost now to take it.`,
      link: '/profile/areas',
    })
    const { data: u } = await admin.from('users').select('email').eq('id', w.user_id as string).maybeSingle()
    if (u?.email) await sendEmail(u.email as string, boostSlotFree({ district, tradeType: type }))
  }
}
