import { getStripeClient } from '@/lib/stripe/client'

/**
 * Rolling 12 month subscription revenue from Stripe, against the £90,000 VAT registration threshold
 * (PRD 3). Falls back to an estimate from active subscribers when Stripe isn't reachable.
 */
export async function rollingRevenuePence(activeSubscribers: number): Promise<{ pence: number; estimated: boolean }> {
  if (!process.env.STRIPE_SECRET_KEY) return { pence: activeSubscribers * 1999 * 12, estimated: true }
  try {
    const since = Math.floor((Date.now() - 365 * 86_400_000) / 1000)
    let total = 0
    for await (const inv of getStripeClient().invoices.list({ status: 'paid', created: { gte: since }, limit: 100 })) {
      total += inv.amount_paid
    }
    return { pence: total, estimated: false }
  } catch (err) {
    console.error('Revenue lookup failed:', err)
    return { pence: activeSubscribers * 1999 * 12, estimated: true }
  }
}

export const VAT_THRESHOLD_PENCE = 9_000_000
