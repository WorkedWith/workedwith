import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe/client'
import { boostPriceId } from '@/lib/stripe/prices'
import { isOnPaidPlan } from '@/lib/plan'
import { fullTradeTypes, notifyWaitlist } from '@/lib/boosts/slots'
import {
  ADDON_PRICE_TEXT,
  MAX_BOOSTS,
  type BoostChangeResult,
  type BoostSummary,
} from '@/lib/boost-types'

// Server only. Single place where boosted districts, add-on slots and Stripe billing are kept in step.
//
// Model (PRD v4.2 section 15): no boosts are included in the plan. Every boost is £10 a month.
//   needed slots  = boosted districts
//   billedSlots   = what Stripe will bill from the next invoice (boosted_district_addon_quantity)
//   paidSlots     = slots already paid for in this billing period (boosted_district_addon_paid_quantity)
// Turning a paid boost off lowers Stripe straight away with no proration (no refund, no charge), but the
// slot stays usable until renewal, so switching a boost back on before then is free.


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
    item => item.price.id === priceId,
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
      'subscription_status, trial_ends_at, trade_types, stripe_subscription_id, operating_areas, boosted_districts, boosted_district_addon_quantity, boosted_district_addon_paid_quantity, subscription_expires_at',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile) return { status: 'error', error: 'Trade profile not found.' }
  if (!isOnPaidPlan({ subscription_status: profile.subscription_status as string, trial_ends_at: profile.trial_ends_at as string | null })) {
    return { status: 'error', error: 'Boosted Districts are available once you are on the paid plan, after your free trial.' }
  }
  const previous = (profile.boosted_districts as string[] | null) ?? []
  const added = next.filter(d => !previous.includes(d))
  const removed = previous.filter(d => !next.includes(d))

  const operatingAreas = (profile.operating_areas as string[] | null) ?? []
  const outside = next.filter(d => !operatingAreas.includes(d))
  if (outside.length > 0) {
    return { status: 'error', error: `${outside.join(', ')} ${outside.length === 1 ? 'is' : 'are'} not in your Operating Areas.` }
  }

  if (added.length > 0) {
    const { data: enabledRows } = await admin
      .from('boost_district_settings')
      .select('district')
      .in('district', added)
      .eq('boosts_enabled', true)
    const enabled = new Set((enabledRows ?? []).map(r => r.district as string))
    const notYet = added.filter(d => !enabled.has(d))
    if (notYet.length > 0) {
      return { status: 'error', error: `Boosts are not available in ${notYet.join(', ')} yet. We switch them on once clients are searching there.` }
    }
    const tradeTypes = (profile.trade_types as string[] | null) ?? []
    for (const d of added) {
      const full = await fullTradeTypes(admin, d, tradeTypes, userId)
      if (full.length > 0) return { status: 'full', district: d, tradeTypes: full }
    }
  }

  const needed = next.length
  if (needed > MAX_BOOSTS) {
    return { status: 'error', error: 'You have reached the maximum number of boosted districts.' }
  }

  const billed = (profile.boosted_district_addon_quantity as number | null) ?? 0
  const paid = Math.max((profile.boosted_district_addon_paid_quantity as number | null) ?? 0, billed)
  const renewsOn = (profile.subscription_expires_at as string | null) ?? null
  const subscriptionId = profile.stripe_subscription_id as string | null
  const addonPriceId = boostPriceId()

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
        error: 'Extra boosted districts are not set up yet. Please contact support.',
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

  // A slot freed up: tell the waiting list
  for (const d of removed) await notifyWaitlist(admin, d)

  const summary: BoostSummary = { boosted: next, billedSlots: newBilled, paidSlots: newPaid, renewsOn }
  return { status: 'ok', summary }
}
