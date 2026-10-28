import { createAdminClient } from '@/lib/supabase/admin'
import { clientProfileUrl } from '@/lib/share-links'
import { ShareProfileCard } from './share-profile-card'

/** "Share my WorkedWith profile" on the client dashboard. */
export async function ShareProfileSection({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const { data: cp } = await admin.from('client_profiles').select('username').eq('user_id', userId).maybeSingle()
  const username = (cp as { username: string | null } | null)?.username
  if (!username) return null
  return <ShareProfileCard url={clientProfileUrl(username)} />
}
