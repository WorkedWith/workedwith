import type Stripe from 'stripe'
import { getStripeClient } from './client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionTier } from '@/types/database'

// Maps a Stripe price ID to a WorkedWith subscription tier.
// Active and trialing statuses both count as the paid tier.
function tierFromPriceId(priceId: string | null | undefined): SubscriptionTier {
  if (!priceId) return 'free'
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'team'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  return 'free'
}

function activeTier(subscription: Stripe.Subscription): SubscriptionTier {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return 'free'
  }
  const priceId = subscription.items.data[0]?.price.id
  return tierFromPriceId(priceId)
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

      // Retrieve subscription to determine tier from price
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const tier = activeTier(subscription)

      await admin
        .from('trade_profiles')
        .update({
          subscription_tier: tier,
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
      const tier = activeTier(subscription)

      await admin
        .from('trade_profiles')
        .update({
          subscription_tier: tier,
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
          stripe_subscription_id: null,
          is_searchable: false,
        })
        .eq('stripe_customer_id', customerId)

      break
    }

    // Unhandled events are silently ignored
  }
}
