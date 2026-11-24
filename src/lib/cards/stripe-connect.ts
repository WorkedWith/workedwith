import { getStripeClient } from '@/lib/stripe/client'
import { APP_URL } from '@/lib/app-url'
import { cardsMode } from './mode'

/**
 * Stripe Connect for optional card payments (PRD 4, 9). Accounts are created so Stripe handles pricing:
 * the connected account pays Stripe's fees, Stripe owns losses, and the trade has the full Stripe dashboard.
 * WorkedWith never sets an application fee. TODO(keys): test in Stripe test mode with Connect enabled.
 */
export async function createConnectedAccount(email: string, businessName: string): Promise<string> {
  if (cardsMode() === 'mock') return `acct_mock_${Math.random().toString(36).slice(2, 10)}`
  const stripe = getStripeClient()
  const account = await stripe.accounts.create({
    country: 'GB',
    email,
    business_profile: { name: businessName },
    controller: {
      fees: { payer: 'account' },
      losses: { payments: 'stripe' },
      stripe_dashboard: { type: 'full' },
    },
  })
  return account.id
}

export async function onboardingLink(accountId: string): Promise<string> {
  if (cardsMode() === 'mock') return `${APP_URL}/api/cards/return?mock=1&account=${encodeURIComponent(accountId)}`
  const stripe = getStripeClient()
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${APP_URL}/profile/getting-paid?cards=refresh`,
    return_url: `${APP_URL}/api/cards/return`,
  })
  return link.url
}

export async function accountStatus(accountId: string): Promise<{ charges: boolean; payouts: boolean }> {
  if (cardsMode() === 'mock') return { charges: true, payouts: true }
  const a = await getStripeClient().accounts.retrieve(accountId)
  return { charges: !!a.charges_enabled, payouts: !!a.payouts_enabled }
}

/**
 * A Checkout Session on the trade's own Stripe account (a direct charge). No application fee, no saved
 * cards, no surcharge: the price is the same whichever way the client pays (PRD 9).
 */
export async function cardCheckout(p: { accountId: string; amountPence: number; description: string; stageId: string; invoiceId: string; jobId: string; email: string | null }): Promise<string> {
  if (cardsMode() === 'mock') {
    return `${APP_URL}/my/pay/mock?stage=${encodeURIComponent(p.stageId)}&amount=${p.amountPence}`
  }
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: p.email ?? undefined,
    line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: p.amountPence, product_data: { name: p.description } } }],
    payment_intent_data: { metadata: { stage_id: p.stageId, invoice_id: p.invoiceId, job_id: p.jobId }, setup_future_usage: undefined },
    metadata: { stage_id: p.stageId, invoice_id: p.invoiceId, job_id: p.jobId },
    success_url: `${APP_URL}/my/jobs/${p.jobId}?card=paid`,
    cancel_url: `${APP_URL}/my/jobs/${p.jobId}?card=cancelled`,
  }, { stripeAccount: p.accountId })
  return session.url ?? `${APP_URL}/my/jobs/${p.jobId}`
}

export async function refundCard(accountId: string, paymentIntentId: string, amountPence: number): Promise<void> {
  if (cardsMode() === 'mock') return
  await getStripeClient().refunds.create({ payment_intent: paymentIntentId, amount: amountPence }, { stripeAccount: accountId })
}

/** Stripe's fee on a card payment, from the balance transaction, so it shows in exports and syncs. */
export async function stripeFeeFor(accountId: string, paymentIntentId: string): Promise<number | null> {
  if (cardsMode() === 'mock') return null
  try {
    const pi = await getStripeClient().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.balance_transaction'] }, { stripeAccount: accountId })
    const charge = pi.latest_charge
    if (charge && typeof charge !== 'string' && charge.balance_transaction && typeof charge.balance_transaction !== 'string') return charge.balance_transaction.fee
  } catch (err) {
    console.error('Stripe fee lookup failed (non-fatal):', err)
  }
  return null
}

export async function submitDisputeEvidence(accountId: string, disputeId: string, evidence: { summary: string; customerName: string; email: string | null; serviceDate: string | null }): Promise<void> {
  if (cardsMode() === 'mock') return
  // TODO(test mode): also upload the job report PDF with stripe.files.create (purpose dispute_evidence) and attach it as uncategorized_file
  await getStripeClient().disputes.update(disputeId, {
    evidence: { customer_name: evidence.customerName, customer_email_address: evidence.email ?? undefined, service_date: evidence.serviceDate ?? undefined, uncategorized_text: evidence.summary.slice(0, 20000) },
    submit: true,
  }, { stripeAccount: accountId })
}
