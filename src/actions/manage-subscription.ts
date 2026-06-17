'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe/client'

export type PortalResult = { url: string } | { error: string }

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://workedwith.co.uk'

export async function createPortalSession(): Promise<PortalResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const customerId = tradeProfile?.stripe_customer_id as string | null | undefined
  if (!customerId) {
    return { error: 'No active subscription found.' }
  }

  const stripe = getStripeClient()
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${BASE_URL}/subscription`,
  })

  return { url: session.url }
}
