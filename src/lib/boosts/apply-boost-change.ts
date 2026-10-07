import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe/client'
import {
  ADDON_MAX,
  ADDON_PRICE_TEXT,
  INCLUDED_BOOSTS,
  type BoostChangeResult,
  type BoostSummary,
} from '@/lib/boost-types'

// Server only. Single place where boosted districts, add-on slots and Stripe billing are kept in step.
//
// Model (PRD v3.5):
//   needed slots  = max(0, boosted districts - 3)
//   billedSlots   = what Stripe will bill from the next invoice (boosted_district_addon_quantity)
//   paidSlots     = slots already paid for in this billing period (boosted_district_addon_paid_quantity)
// Turning a paid boost off lowers Stripe straight away with no proration (no refund, no charge), but the
// slot stays usable until renewal, so switching a boost back on before then is free.

const MONTHLY_ADDON_PRICE = process.env.STRIPE_PRO_ADDON_PRICE_ID
const ANNUAL_ADDON_PRICE = process.env.STRIPE_PRO_ADDON_ANNUAL_PRICE_ID

export type BoostEvent =
  | { type: 'on' | 'off'; district: string }
  | { type: 'swap'; from: string; to: string }
  | { type: 'area_removed'; districts: string[] }

export type ApplyBoostOptions = {
  /** The trade has seen and accepted the £10 per month charge for any new paid slot */
  confirmedPaid: boolean
  event: BoostEvent
}

async function setAddonQuantity(
  subscriptionId: string,
  priceId: string,
  qty: number,
  proration: 'none' | 'create_prorations',
): Promise<void> {
  const stripe = getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const existing = subscription.items.data.find(
    item => item.price.id === MONTHLY_ADDON_PRICE || item.price.id === ANNUAL_ADDON_PRICE,
  )

  if (qty === 0) {
    if (existing) {
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: existing.id, deleted: true }],
        proration_behavior: proration,
      })
    }
    return
  }

  if (existing) {
    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: existing.id, quantity: qty }],
      proration_behavior: proration,
    })
  } else {
    await stripe.subscriptions.update(subscriptionId, {
      items: [{ price: priceId, quantity: qty }],
      proration_behavior: proration,
    })
  }
}

export async function applyBoostChange(
  userId: string,
  requested: string[],
  opts: ApplyBoostOptions,
): Promise<BoostChangeResult> {
  const next = Array.from(new Set(requested.map(d => d.trim().toUpperCase())))

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('trade_profiles')
    .select(
      'subscription_tier, billing_period, stripe_subscription_id, operating_areas, boosted_districts, boosted_district_addon_quantity, boosted_district_addon_paid_quantity, subscription_expires_at',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile) return { status: 'error', error: 'Trade profile not found.' }
  if ((profile.subscription_tier as string) !== 'pro') {
    return { status: 'error', error: 'Boosted Districts need a Pro plan.' }
  }

  const operatingAreas = (profile.operating_areas as string[] | null) ?? []
  const outside = next.filter(d => !operatingAreas.includes(d))
  if (outside.length > 0) {
    return { status: 'error', error: `${outside.join(', ')} ${outside.length === 1 ? 'is' : 'are'} not in your Operating Areas.` }
  }

  const needed = Math.max(0, next.length - INCLUDED_BOOSTS)
  if (needed > ADDON_MAX) {
    return { status: 'error', error: 'You have reached the maximum number of boosted districts.' }
  }

  const billed = (profile.boosted_district_addon_quantity as number | null) ?? 0
  const paid = Math.max((profile.boosted_district_addon_paid_quantity as number | null) ?? 0, billed)
  const renewsOn = (profile.subscription_expires_at as string | null) ?? null
  const subscriptionId = profile.stripe_subscription_id as string | null
  const isAnnual = (profile.billing_period as string | null) === 'annual'
  const addonPriceId = isAnnual ? ANNUAL_ADDON_PRICE : MONTHLY_ADDON_PRICE

  let newBilled = billed
  let newPaid = paid

  if (needed > billed) {
    // Need more billed slots. Slots already paid this period come back free; the rest are new charges.
    const extra = Math.max(0, needed - paid)

    if (extra > 0 && !opts.confirmedPaid) {
      return { status: 'needs_confirm', extraSlots: extra, priceText: ADDON_PRICE_TEXT }
    }
    if (!subscriptionId) return { status: 'error', error: 'No active subscription found.' }
    if (!addonPriceId) {
      return {
        status: 'error',
        error: isAnnual
          ? 'Extra boosted districts are not available on annual plans yet. Your 3 included districts still work.'
          : 'Extra boosted districts are not set up yet. Please contact support.',
      }
    }

    try {
      const freeTarget = Math.min(needed, paid)
      if (freeTarget > billed) {
        // Reactivate slots already paid for: no charge
        await setAddonQuantity(subscriptionId, addonPriceId, freeTarget, 'none')
      }
      if (needed > freeTarget) {
        // Genuinely new slots: Stripe charges the part month now
        await setAddonQuantity(subscriptionId, addonPriceId, needed, 'create_prorations')
      }
    } catch (err) {
      console.error('Boost add-on increase failed:', err)
      return { status: 'error', error: 'We could not update your plan. You have not been charged. Please try again.' }
    }
    newBilled = needed
    newPaid = Math.max(paid, needed)
  } else if (needed < billed) {
    // Fewer slots: stop billing from the next invoice. No refund, slot stays usable until renewal.
    if (!subscriptionId || !addonPriceId) {
      return { status: 'error', error: 'No active subscription found.' }
    }
    try {
      await setAddonQuantity(subscriptionId, addonPriceId, needed, 'none')
    } catch (err) {
      console.error('Boost add-on decrease failed:', err)
      return { status: 'error', error: 'We could not update your plan. Please try again.' }
    }
    newBilled = needed
  }

  const { error: updateErr } = await admin
    .from('trade_profiles')
    .update({
      boosted_districts: next,
      boosted_district_addon_quantity: newBilled,
      boosted_district_addon_paid_quantity: newPaid,
      boosted_districts_updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateErr) {
    console.error('Boost save failed:', updateErr)
    return { status: 'error', error: 'We could not save that change. Please try again.' }
  }

  // Log (non-fatal)
  const ev = opts.event
  const rows: Array<{
    user_id: string
    event_type: 'on' | 'off' | 'swap' | 'area_removed'
    district?: string
    from_district?: string
    to_district?: string
  }> =
    ev.type === 'swap'
      ? [{ user_id: userId, event_type: 'swap', from_district: ev.from, to_district: ev.to }]
      : ev.type === 'area_removed'
        ? ev.districts.map(d => ({ user_id: userId, event_type: 'area_removed' as const, district: d }))
        : [{ user_id: userId, event_type: ev.type, district: ev.district }]
  const { error: logErr } = await admin.from('boost_events').insert(rows)
  if (logErr) console.error('boost_events insert failed (non-fatal):', logErr)

  const summary: BoostSummary = { boosted: next, billedSlots: newBilled, paidSlots: newPaid, renewsOn }
  return { status: 'ok', summary }
}
