'use server'

import { APP_URL } from '@/lib/app-url'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe/client'
import { planPriceId } from '@/lib/stripe/prices'

export type CheckoutResult = { url: string } | { error: string }

/**
 * Card for the one plan (PRD 3). If the trade is still inside their 30 day trial, Stripe's trial runs
 * to the same end date so nothing is charged until the WorkedWith trial is over.
 */
export async function createCheckoutSession(): Promise<CheckoutResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || !userData.phone_verified) {
    return { error: 'Phone verification is required before subscribing.' }
  }
  if (userData.user_type !== 'trade' && userData.user_type !== 'both') {
    return { error: 'The plan is for trade accounts only.' }
  }

  const priceId = planPriceId()
  if (!priceId) return { error: 'Billing is not set up yet. Please try again later.' }

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) return { error: 'Trade profile not found.' }
  if (tradeProfile.subscription_status === 'active' && tradeProfile.stripe_subscription_id) {
    return { error: 'You already have the plan.' }
  }

  const stripe = getStripeClient()

  try {
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

    // Stripe needs a trial end at least 48 hours away
    const trialEnds = tradeProfile.trial_ends_at ? new Date(tradeProfile.trial_ends_at as string) : null
    const trialEndUnix =
      trialEnds && trialEnds.getTime() > Date.now() + 48 * 3_600_000 ? Math.floor(trialEnds.getTime() / 1000) : undefined

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { user_id: user.id },
        ...(trialEndUnix ? { trial_end: trialEndUnix } : {}),
      },
      success_url: `${APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/subscription`,
      allow_promotion_codes: true,
    })

    if (!session.url) return { error: 'Failed to create checkout session.' }
    return { url: session.url }
  } catch (stripeError) {
    console.error('Stripe API error:', stripeError)
    return { error: 'Payment service unavailable. Please try again.' }
  }
}
