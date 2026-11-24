import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export type TradeSession = { userId: string; admin: AdminClient; tradeProfileId: string }

/** For server actions: the signed in trade, or null. */
export async function getTradeSession(): Promise<TradeSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: tp } = await admin.from('trade_profiles').select('id').eq('user_id', user.id).maybeSingle()
  if (!tp) return null
  return { userId: user.id, admin, tradeProfileId: tp.id as string }
}

/** For server actions: the signed in user (any type), or null. */
export async function getUserSession(): Promise<{ userId: string; admin: AdminClient } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id, admin: createAdminClient() }
}
