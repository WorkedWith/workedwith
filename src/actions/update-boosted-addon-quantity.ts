'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe/client'

const ADDON_PRICE_ID = process.env.STRIPE_PRO_ADDON_PRICE_ID!
const ADDON_MAX = 17  // 3 included + 17 add-on = 20 max total

export type UpdateBoostedAddonResult =
  | { success: true; newQty: number }
  | { success: false; error: string }

export async function updateBoostedAddonQuantity(
  newQty: number,
): Promise<UpdateBoostedAddonResult> {
  if (!Number.isInteger(newQty) || newQty < 0 || newQty > ADDON_MAX) {
    return { success: false, error: `Add-on slots must be between 0 and ${ADDON_MAX}.` }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('trade_profiles')
    .select('subscription_tier, billing_period, stripe_subscription_id, boosted_district_addon_quantity, boosted_districts, boosted_districts_updated_at, subscription_period_start_at, subscription_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return { success: false, error: 'Trade profile not found.' }
  if ((profile.subscription_tier as string) !== 'pro') {
    return { success: false, error: 'Boosted District add-ons require a Pro subscription.' }
  }

  const subscriptionId = profile.stripe_subscription_id as string | null
  if (!subscriptionId) {
    return { success: false, error: 'No active subscription found.' }
  }

  const currentQty = (profile.boosted_district_addon_quantity as number) ?? 0
  if (newQty === currentQty) return { success: true, newQty }

  const isDecrease = newQty < currentQty

  if (isDecrease) {
    // Block if the new max (3 + newQty) would be fewer than the current active boosts.
    // The trade must first deselect districts to create headroom.
    const activeBoosted = ((profile.boosted_districts as string[]) ?? []).length
    const newMax = 3 + newQty
    if (activeBoosted > newMax) {
      return {
        success: false,
        error: `You currently have ${activeBoosted} Boosted District${activeBoosted !== 1 ? 's' : ''} active. Reduce your selection to ${newMax} or fewer on the Operating Areas page before removing a slot.`,
      }
    }

    // Apply the same 30-day cooldown as district-list changes (one pool rule).
    const updatedAt = profile.boosted_districts_updated_at as string | null
    const billingPeriod = profile.billing_period as string | null
    const isAnnual = billingPeriod === 'annual'

    if (updatedAt) {
      const updatedDate = new Date(updatedAt)
      if (isAnnual) {
        const availableAt = new Date(updatedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        if (new Date() < availableAt) {
          const fmt = availableAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          return {
            success: false,
            error: `You can remove a slot from ${fmt} (30-day cooldown).`,
          }
        }
      } else {
        const periodStart = profile.subscription_period_start_at as string | null
        if (periodStart && updatedDate >= new Date(periodStart)) {
          const expiresAt = profile.subscription_expires_at as string | null
          const fmt = expiresAt
            ? new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'your next renewal'
          return {
            success: false,
            error: `You can remove a slot from ${fmt} (one change per billing cycle).`,
          }
        }
      }
    }
  }

  // ── Stripe update ─────────────────────────────────────────────

  const stripe = getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const addonItem = subscription.items.data.find(item => item.price.id === ADDON_PRICE_ID)

  try {
    if (newQty === 0 && addonItem) {
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: addonItem.id, deleted: true }],
        proration_behavior: 'create_prorations',
      })
    } else if (newQty > 0 && addonItem) {
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: addonItem.id, quantity: newQty }],
        proration_behavior: 'create_prorations',
      })
    } else if (newQty > 0) {
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ price: ADDON_PRICE_ID, quantity: newQty }],
        proration_behavior: 'create_prorations',
      })
    }
  } catch {
    return { success: false, error: 'Failed to update your subscription. Please try again.' }
  }

  // ── DB sync (webhook will also confirm, but update optimistically) ────────

  if (isDecrease) {
    // Decreasing starts a new cooldown window
    await admin
      .from('trade_profiles')
      .update({
        boosted_district_addon_quantity: newQty,
        boosted_districts_updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
  } else {
    await admin
      .from('trade_profiles')
      .update({ boosted_district_addon_quantity: newQty })
      .eq('user_id', user.id)
  }

  return { success: true, newQty }
}
