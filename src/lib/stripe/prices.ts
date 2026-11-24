/**
 * Stripe prices (PRD 3). One plan and one add-on.
 * STRIPE_PRO_ADDON_PRICE_ID is read as a fallback so an existing £10 add-on price keeps working.
 */
export function planPriceId(): string | undefined {
  return process.env.STRIPE_PLAN_PRICE_ID || undefined
}

export function boostPriceId(): string | undefined {
  return process.env.STRIPE_BOOST_PRICE_ID || process.env.STRIPE_PRO_ADDON_PRICE_ID || undefined
}
