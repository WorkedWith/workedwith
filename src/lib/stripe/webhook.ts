import type Stripe from 'stripe'
import { getStripeClient } from './client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BillingPeriod, SubscriptionTier } from '@/types/database'

function tierFromPriceId(priceId: string | null | undefined): SubscriptionTier {
  if (!priceId) return 'free'
  const standardIds = [
    process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID,
    process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID,
  ]
  const proIds = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  ]
  if (standardIds.includes(priceId)) return 'standard'
  if (proIds.includes(priceId)) return 'pro'
  return 'free'
}

function billingPeriodFromPriceId(priceId: string | null | undefined): BillingPeriod {
  const annualIds = [
    process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID,
    process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  ]
  return priceId && annualIds.includes(priceId) ? 'annual' : 'monthly'
}

function activeTier(subscription: Stripe.Subscription): { tier: SubscriptionTier; billingPeriod: BillingPeriod } {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return { tier: 'free', billingPeriod: 'monthly' }
  }
  const priceId = subscription.items.data[0]?.price.id ?? null
  return {
    tier: tierFromPriceId(priceId),
    billingPeriod: billingPeriodFromPriceId(priceId),
  }
}

export async function handleStripeWebhook(body: string, sig: string): Promise<void> {
  const stripe = getStripeClient()
  const secret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    throw new Error('Invalid Stripe webhook signature')
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string | null
      const subscriptionId = session.subscription as string | null
      const userId = session.client_reference_id

      if (!userId || !subscriptionId || !customerId) break

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const { tier, billingPeriod } = activeTier(subscription)
      const periodEndTs = subscription.items.data[0]?.current_period_end ?? null
      const currentPeriodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null

      await admin
        .from('trade_profiles')
        .update({
          subscription_tier: tier,
          billing_period: billingPeriod,
          subscription_expires_at: currentPeriodEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          is_searchable: tier !== 'free',
        })
        .eq('user_id', userId)

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const { tier, billingPeriod } = activeTier(subscription)
      const periodEndTs = subscription.items.data[0]?.current_period_end ?? null
      const currentPeriodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null

      await admin
        .from('trade_profiles')
        .update({
          subscription_tier: tier,
          billing_period: billingPeriod,
          subscription_expires_at: currentPeriodEnd,
          stripe_subscription_id: subscription.id,
          is_searchable: tier !== 'free',
        })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await admin
        .from('trade_profiles')
        .update({
          subscription_tier: 'free',
          billing_period: 'monthly',
          subscription_expires_at: null,
          stripe_subscription_id: null,
          is_searchable: false,
        })
        .eq('stripe_customer_id', customerId)

      break
    }
  }
}
