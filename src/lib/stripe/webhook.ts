import type Stripe from 'stripe'
import { supersedeGrantIfCovered } from '@/lib/grants'
import { sendEmail } from '@/lib/email/send'
import { paymentFailed, planCancelled, planStarted } from '@/lib/email/templates'
import { formatDateLong } from '@/lib/email/format'
import type { EmailContent } from '@/lib/email/layout'
import { getStripeClient } from './client'
import { boostPriceId, planPriceId } from './prices'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshPlanState } from '@/lib/plan'
import type { SubscriptionStatus } from '@/types/database'
import { handleConnectEvent } from '@/lib/cards/connect-webhook'

type AdminClient = ReturnType<typeof createAdminClient>

async function emailUser(admin: AdminClient, userId: string, content: EmailContent): Promise<void> {
  const { data } = await admin.from('users').select('email').eq('id', userId).maybeSingle()
  const to = data?.email as string | undefined
  if (!to) return
  const r = await sendEmail(to, content)
  if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
}

/** Stripe status to the plan status (PRD 21). A Stripe trial with a card saved counts as subscribed. */
function planStatus(subscription: Stripe.Subscription): SubscriptionStatus {
  const s = subscription.status
  if (s === 'active' || s === 'trialing' || s === 'past_due') {
    const hasPlan = subscription.items.data.some(i => i.price.id === planPriceId())
    // If the price env var is missing, trust Stripe rather than lapsing everyone
    return hasPlan || !planPriceId() ? 'active' : 'lapsed'
  }
  if (s === 'canceled') return 'cancelled'
  return 'lapsed'
}

function boostQuantity(subscription: Stripe.Subscription): number {
  const id = boostPriceId()
  if (!id) return 0
  return subscription.items.data.find(item => item.price.id === id)?.quantity ?? 0
}

function periodDates(subscription: Stripe.Subscription): { start: string | null; end: string | null } {
  const item = subscription.items.data[0]
  return {
    start: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
    end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
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

  // Events from trades' own connected Stripe accounts (optional cards, phase 13)
  if (event.account) {
    await handleConnectEvent(admin, event)
    return
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string | null
      const subscriptionId = session.subscription as string | null
      const userId = session.client_reference_id
      if (!userId || !subscriptionId || !customerId) break

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const status = planStatus(subscription)
      const { start, end } = periodDates(subscription)

      await admin
        .from('trade_profiles')
        .update({
          subscription_status: status,
          subscription_expires_at: end,
          subscription_period_start_at: start,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq('user_id', userId)
      await refreshPlanState(admin, userId)

      if (status === 'active') await supersedeGrantIfCovered(admin, userId)

      await emailUser(admin, userId, planStarted({
        trialEnds: subscription.trial_end ? formatDateLong(new Date(subscription.trial_end * 1000)) : null,
      }))
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const status = planStatus(subscription)
      const qty = boostQuantity(subscription)
      const { start, end } = periodDates(subscription)

      const { data: existing } = await admin
        .from('trade_profiles')
        .select('user_id, subscription_period_start_at, boosted_district_addon_paid_quantity')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      if (!existing) break
      const userId = existing.user_id as string

      // Slots already paid for stay usable until the billing period rolls over
      const storedStart = (existing.subscription_period_start_at as string | null) ?? null
      const storedPaid = (existing.boosted_district_addon_paid_quantity as number | null) ?? 0
      const rolledOver = !storedStart || !start || new Date(storedStart).getTime() !== new Date(start).getTime()
      const active = status === 'active'
      const paidQty = !active ? 0 : rolledOver ? qty : Math.max(storedPaid, qty)

      await admin
        .from('trade_profiles')
        .update({
          subscription_status: status,
          subscription_expires_at: end,
          subscription_period_start_at: start,
          stripe_subscription_id: subscription.id,
          boosted_district_addon_quantity: active ? qty : 0,
          boosted_district_addon_paid_quantity: paidQty,
          // Cancelling the plan, or the plan lapsing, ends all boosts (PRD 3)
          ...(active ? {} : { boosted_districts: [], boosted_districts_updated_at: null }),
        })
        .eq('user_id', userId)
      await refreshPlanState(admin, userId)
      if (active) await supersedeGrantIfCovered(admin, userId)

      const previous = (event.data as { previous_attributes?: Partial<Stripe.Subscription> }).previous_attributes
      if (subscription.cancel_at_period_end && previous && previous.cancel_at_period_end === false) {
        await emailUser(admin, userId, planCancelled({ endsOn: formatDateLong(end) ?? 'the end of this billing period' }))
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const { data: lapsed } = await admin
        .from('trade_profiles')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      if (!lapsed) break

      await admin
        .from('trade_profiles')
        .update({
          subscription_status: 'cancelled',
          subscription_expires_at: null,
          subscription_period_start_at: null,
          stripe_subscription_id: null,
          boosted_districts: [],
          boosted_districts_updated_at: null,
          boosted_district_addon_quantity: 0,
          boosted_district_addon_paid_quantity: 0,
        })
        .eq('user_id', lapsed.user_id as string)
      await refreshPlanState(admin, lapsed.user_id as string)
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

      await admin.from('notifications').insert({
        user_id: userId,
        type: 'subscription_updated',
        title: 'Payment failed',
        body: 'Your WorkedWith payment failed. Please update your card to keep your plan active.',
        link: '/subscription',
      })
      await emailUser(admin, userId, paymentFailed())
      break
    }
  }
}
