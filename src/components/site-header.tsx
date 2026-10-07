import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/app-header'
import { PublicTopBar } from '@/components/public-top-bar'

/** Signed in visitors get the app header, everyone else gets the public bar with a clear way home. */
export async function SiteHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? <AppHeader /> : <PublicTopBar />
}
