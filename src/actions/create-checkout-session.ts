'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe/client'

export type CheckoutResult = { url: string } | { error: string }

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://workedwith.co.uk'

const PRICE_IDS: Record<'pro' | 'team', string | undefined> = {
  pro:  process.env.STRIPE_PRO_PRICE_ID,
  team: process.env.STRIPE_TEAM_PRICE_ID,
}

export async function createCheckoutSession(tier: 'pro' | 'team'): Promise<CheckoutResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || !userData.phone_verified) {
    return { error: 'Phone verification is required before subscribing.' }
  }
  if (userData.user_type !== 'trade' && userData.user_type !== 'both') {
    return { error: 'Subscriptions are available for trade accounts only.' }
  }

  const priceId = PRICE_IDS[tier]
  if (!priceId) return { error: `Price ID for ${tier} tier is not configured.` }

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) return { error: 'Trade profile not found.' }

  const stripe = getStripeClient()

  // Create or retrieve Stripe customer
  let customerId = tradeProfile.stripe_customer_id as string | null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email as string,
      name: (tradeProfile.company_name as string | null) ?? (userData.full_name as string),
      metadata: { user_id: user.id },
    })
    customerId = customer.id

    await admin
      .from('trade_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: user.id,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { user_id: user.id },
    },
    success_url: `${BASE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/subscription`,
    allow_promotion_codes: true,
  })

  if (!session.url) return { error: 'Failed to create checkout session.' }
  return { url: session.url }
}
