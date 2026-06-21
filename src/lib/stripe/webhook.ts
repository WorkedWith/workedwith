import type Stripe from 'stripe'
import { Resend } from 'resend'
import { getStripeClient } from './client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BillingPeriod, SubscriptionTier } from '@/types/database'

const tierMap: Record<string, { tier: SubscriptionTier; period: BillingPeriod }> = {
  [process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID!]: { tier: 'standard', period: 'monthly' },
  [process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID!]:  { tier: 'standard', period: 'annual'  },
  [process.env.STRIPE_PRO_MONTHLY_PRICE_ID!]:      { tier: 'pro',      period: 'monthly' },
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID!]:       { tier: 'pro',      period: 'annual'  },
}

function activeTier(subscription: Stripe.Subscription): { tier: SubscriptionTier; billingPeriod: BillingPeriod } {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return { tier: 'free', billingPeriod: 'monthly' }
  }
  const priceId = subscription.items.data[0]?.price.id ?? ''
  const match = tierMap[priceId]
  return {
    tier: match?.tier ?? 'free',
    billingPeriod: match?.period ?? 'monthly',
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
        const resend = new Resend(process.env.RESEND_API_KEY)
        try {
          await resend.emails.send({
            from: 'WorkedWith <hello@workedwith.co.uk>',
            to: userData.email as string,
            subject: 'Action required: Your WorkedWith payment failed',
            html: paymentFailedHtml(),
          })
        } catch (emailError) {
          console.error('Email send failed (non-fatal):', emailError)
        }
      }

      break
    }
  }
}

function paymentFailedHtml(): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0F1F3D;padding:24px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#fff;">Worked<span style="color:#F59E0B;">With</span></span>
</td></tr>
<tr><td style="padding:32px 28px;">
  <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">Payment failed</h1>
  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
    We were unable to process your WorkedWith subscription payment. Stripe will retry automatically, but please update your payment method to avoid any interruption to your service.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
    <a href="https://workedwith.co.uk/subscription" style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
      Update payment method
    </a>
  </td></tr></table>
  <p style="margin:0;font-size:12px;color:#9CA3AF;">Your subscription remains active while Stripe retries. If payment continues to fail, your account will be downgraded automatically.</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #F3F4F6;">
  <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">WorkedWith &bull; hello@workedwith.co.uk</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}
