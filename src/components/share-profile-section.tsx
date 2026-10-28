import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/app-url'
import { ShareProfileCard } from './share-profile-card'

/** "Share my WorkedWith profile" on the client dashboard. */
export async function ShareProfileSection({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const { data: cp } = await admin.from('client_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!cp) return null

  const { data } = await admin
    .from('client_share_links')
    .select('id, token, expires_at, open_count, trade_view_count')
    .eq('client_user_id', userId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  const links = ((data ?? []) as unknown as { id: string; token: string; expires_at: string; open_count: number; trade_view_count: number }[]).map(l => ({
    id: l.id,
    url: `${APP_URL}/c/share/${l.token}`,
    expiresAt: l.expires_at,
    opens: l.open_count,
    tradeViews: l.trade_view_count,
  }))
  return <ShareProfileCard links={links} />
}
