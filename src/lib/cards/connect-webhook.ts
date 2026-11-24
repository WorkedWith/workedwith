import type Stripe from 'stripe'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Optional card payments on trades' own Stripe accounts. Filled in by phase 13. */
export async function handleConnectEvent(_admin: AdminClient, event: Stripe.Event): Promise<void> {
  console.log('Connect event received (not handled yet):', event.type)
}
