import type Stripe from 'stripe'
import { sendEmail } from '@/lib/email/send'
import { paymentFailed, planCancelled, planChanged, planStarted } from '@/lib/email/templates'
import { formatDateLong } from '@/lib/email/format'
import type { EmailContent } from '@/lib/email/layout'
import { getStripeClient } from './client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BillingPeriod, SubscriptionTier } from '@/types/database'

const tierMap: Record<string, { tier: SubscriptionTier; period: BillingPeriod }> = {
  [process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID!]: { tier: 'standard', period: 'monthly' },
  [process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID!]:  { tier: 'standard', period: 'annual'  },
  [process.env.STRIPE_PRO_MONTHLY_PRICE_ID!]:      { tier: 'pro',      period: 'monthly' },
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID!]:       { tier: 'pro',      period: 'annual'  },
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', standard: 'Standard', pro: 'Pro' }

type AdminClient = ReturnType<typeof createAdminClient>

async function emailUser(admin: AdminClient, userId: string, content: EmailContent): Promise<void> {
  const { data } = await admin.from('users').select('email').eq('id', userId).maybeSingle()
  const to = data?.email as string | undefined
  if (!to) return
  const r = await sendEmail(to, content)
  if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
}

const ADDON_PRICE_IDS = [process.env.STRIPE_PRO_ADDON_PRICE_ID].filter((id): id is string => !!id)

function activeTier(subscription: Stripe.Subscription): { tier: SubscriptionTier; billingPeriod: BillingPeriod } {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return { tier: 'free', billingPeriod: 'monthly' }
  }
  // Search all items for the base plan — add-on items are not in tierMap
  const baseItem = subscription.items.data.find(item => tierMap[item.price.id])
  const match = baseItem ? tierMap[baseItem.price.id] : undefined
  return {
    tier: match?.tier ?? 'free',
    billingPeriod: match?.period ?? 'monthly',
  }
}

function addonQuantity(subscription: Stripe.Subscription): number {
  const addonItem = subscription.items.data.find(item => ADDON_PRICE_IDS.includes(item.price.id))
  return addonItem?.quantity ?? 0
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
      const addonQty = addonQuantity(subscription)
      const periodEndTs = subscription.items.data[0]?.current_period_end ?? null
      const currentPeriodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null
      const periodStartTs = subscription.items.data[0]?.current_period_start ?? null
      const currentPeriodStart = periodStartTs ? new Date(periodStartTs * 1000).toISOString() : null

      await admin
        .from('trade_profiles')
        .update({
          subscription_tier: tier,
          billing_period: billingPeriod,
          subscription_expires_at: currentPeriodEnd,
          subscription_period_start_at: currentPeriodStart,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          is_searchable: tier !== 'free',
          boosted_district_addon_quantity: tier === 'pro' ? addonQty : 0,
          boosted_district_addon_paid_quantity: tier === 'pro' ? addonQty : 0,
        })
        .eq('user_id', userId)

      await emailUser(admin, userId, planStarted({
        plan: PLAN_LABEL[tier] ?? tier,
        trialEnds: subscription.trial_end ? formatDateLong(new Date(subscription.trial_end * 1000)) : null,
      }))

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const { tier, billingPeriod } = activeTier(subscription)
      const addonQty = addonQuantity(subscription)
      const periodEndTs = subscription.items.data[0]?.current_period_end ?? null
      const currentPeriodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null
      const periodStartTs = subscription.items.data[0]?.current_period_start ?? null
      const currentPeriodStart = periodStartTs ? new Date(periodStartTs * 1000).toISOString() : null

      // On downgrade away from Pro, clear all boost state so the subset constraint
      // isn't circumvented and billing stops cleanly.
      const boostClear = tier !== 'pro'
        ? { boosted_districts: [], boosted_districts_updated_at: null }
        : {}

      // Slots already paid for stay usable until the billing period rolls over.
      // A new period start means renewal: paid slots reset to what was actually billed.
      const { data: existing } = await admin
        .from('trade_profiles')
        .select('user_id, subscription_tier, subscription_period_start_at, boosted_district_addon_paid_quantity')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      const storedStart = (existing?.subscription_period_start_at as string | null) ?? null
      const storedPaid = (existing?.boosted_district_addon_paid_quantity as number | null) ?? 0
      const periodRolledOver =
        !storedStart || !currentPeriodStart || new Date(storedStart).getTime() !== new Date(currentPeriodStart).getTime()
      const paidQty = tier !== 'pro' ? 0 : periodRolledOver ? addonQty : Math.max(storedPaid, addonQty)

      await admin
        .from('trade_profiles')
        .update({
          subscription_tier: tier,
          billing_period: billingPeriod,
          subscription_expires_at: currentPeriodEnd,
          subscription_period_start_at: currentPeriodStart,
          stripe_subscription_id: subscription.id,
          is_searchable: tier !== 'free',
          boosted_district_addon_quantity: tier === 'pro' ? addonQty : 0,
          boosted_district_addon_paid_quantity: paidQty,
          ...boostClear,
        })
        .eq('stripe_customer_id', customerId)

      // Customer emails: only on a real change, never on routine renewals
      const existingUserId = (existing?.user_id as string | null) ?? null
      const previous = (event.data as { previous_attributes?: Partial<Stripe.Subscription> }).previous_attributes
      if (existingUserId) {
        if (subscription.cancel_at_period_end && previous && previous.cancel_at_period_end === false) {
          await emailUser(admin, existingUserId, planCancelled({
            plan: PLAN_LABEL[tier] ?? tier,
            endsOn: formatDateLong(currentPeriodEnd) ?? 'the end of this billing period',
          }))
        } else if (
          existing?.subscription_tier &&
          existing.subscription_tier !== 'free' &&
          tier !== 'free' &&
          existing.subscription_tier !== tier
        ) {
          await emailUser(admin, existingUserId, planChanged({ plan: PLAN_LABEL[tier] ?? tier }))
        }
      }

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Clear boosted districts and add-on on lapse/cancel — no silent reinstatement on resubscribe
      await admin
        .from('trade_profiles')
        .update({
          subscription_tier: 'free',
          billing_period: 'monthly',
          subscription_expires_at: null,
          subscription_period_start_at: null,
          stripe_subscription_id: null,
          is_searchable: false,
          boosted_districts: [],
          boosted_districts_updated_at: null,
          boosted_district_addon_quantity: 0,
          boosted_district_addon_paid_quantity: 0,
        })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer as Stripe.Customer | null)?.id ?? null

      if (!customerId) break

      const { data: tradeProfile } = await admin
        .from('trade_profiles')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (!tradeProfile) break

      const userId = tradeProfile.user_id as string

      const { data: userData } = await admin
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()

      await admin.from('notifications').insert({
        user_id: userId,
        type: 'subscription_updated',
        title: 'Payment failed',
        body: 'Your WorkedWith payment failed. Please update your payment method to keep your subscription active.',
        link: '/subscription',
      })

      if (userData?.email) {
        const r = await sendEmail(userData.email as string, paymentFailed())
        if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
      }

      break
    }
  }
}
