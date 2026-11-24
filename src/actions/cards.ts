'use server'

import { revalidatePath } from 'next/cache'
import { getTradeSession, getUserSession } from '@/lib/auth/require-trade'
import { accountStatus, cardCheckout, createConnectedAccount, onboardingLink, refundCard, submitDisputeEvidence } from '@/lib/cards/stripe-connect'
import { cardsMode } from '@/lib/cards/mode'
import { recordPayment } from '@/lib/payments/apply'
import { recordRefundCredit } from '@/lib/payments/refunds'
import { logJobEvent } from '@/lib/jobs/events'
import { parsePounds, formatPence } from '@/lib/money'
import { issueInvoiceForStage } from '@/lib/invoices/issue'

type R<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }
const PATH = '/profile/getting-paid'

/** Accept cards (optional, any time): connect Stripe, set up so Stripe handles pricing (PRD 4). */
export async function startCardSetup(): Promise<R<{ url: string }>> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const { data: existing } = await s.admin.from('trade_card_accounts').select('stripe_account_id').eq('trade_id', s.userId).maybeSingle()
  try {
    let accountId = existing?.stripe_account_id as string | undefined
    if (!accountId) {
      const { data: u } = await s.admin.from('users').select('email').eq('id', s.userId).maybeSingle()
      const { data: tp } = await s.admin.from('trade_profiles').select('company_name').eq('user_id', s.userId).maybeSingle()
      accountId = await createConnectedAccount((u?.email as string) ?? '', (tp?.company_name as string | null) ?? 'Trade')
      await s.admin.from('trade_card_accounts').insert({ trade_id: s.userId, stripe_account_id: accountId })
    }
    return { ok: true, data: { url: await onboardingLink(accountId) } }
  } catch (err) {
    console.error('Card set up failed:', err)
    return { ok: false, error: 'We could not reach Stripe. Please try again.' }
  }
}

export async function setCardsEnabled(on: boolean): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const { data: acc } = await s.admin.from('trade_card_accounts').select('charges_enabled').eq('trade_id', s.userId).maybeSingle()
  if (on && !acc?.charges_enabled) return { ok: false, error: 'Finish setting up Stripe first.' }
  await s.admin.from('trade_card_accounts').update({ cards_enabled: on, updated_at: new Date().toISOString() }).eq('trade_id', s.userId)
  revalidatePath(PATH)
  return { ok: true }
}

/** Card limit per payment (default £1,000). Above it, clients see bank transfer only (PRD 9). */
export async function setCardLimit(pounds: string): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const pence = parsePounds(pounds)
  if (!pence || pence < 1000) return { ok: false, error: 'The limit must be at least £10.' }
  await s.admin.from('trade_card_accounts').update({ card_limit_pence: pence, updated_at: new Date().toISOString() }).eq('trade_id', s.userId)
  revalidatePath(PATH)
  return { ok: true }
}

/** The client pays a due stage by card on the trade's own Stripe account, in full or in part. */
export async function startCardPayment(stageId: string, amount: string): Promise<R<{ url: string }>> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: st } = await s.admin.from('payment_stages').select('*').eq('id', stageId).maybeSingle()
  if (!st) return { ok: false, error: 'Not found.' }
  const { data: job } = await s.admin.from('jobs').select('id, title, client_user_id, trade_user_id').eq('id', st.job_id).maybeSingle()
  if (!job || job.client_user_id !== s.userId || !job.trade_user_id) return { ok: false, error: 'Not found.' }
  const { data: acc } = await s.admin.from('trade_card_accounts').select('*').eq('trade_id', job.trade_user_id).maybeSingle()
  if (!acc?.cards_enabled || !acc.charges_enabled) return { ok: false, error: 'This trade doesn’t take cards. Please pay by bank transfer.' }
  const balance = st.amount_pence - st.amount_paid_pence
  const pence = parsePounds(amount) ?? balance
  const { data: tp } = await s.admin.from('trade_profiles').select('part_payments_enabled').eq('user_id', job.trade_user_id).maybeSingle()
  if (pence !== balance && (!tp?.part_payments_enabled || pence < 1000)) return { ok: false, error: 'Part payments must be £10 or more.' }
  if (pence > balance) return { ok: false, error: `That is more than the ${formatPence(balance)} due.` }
  if (pence > acc.card_limit_pence) return { ok: false, error: `Card payments are limited to ${formatPence(acc.card_limit_pence)} each. Please pay by bank transfer.` }
  const inv = await issueInvoiceForStage(s.admin, stageId)
  const { data: u } = await s.admin.from('users').select('email').eq('id', s.userId).maybeSingle()
  try {
    const url = await cardCheckout({ accountId: acc.stripe_account_id, amountPence: pence, description: `${job.title ?? 'Job'}: ${inv?.invoice_number ?? st.name}`, stageId, invoiceId: inv?.id ?? '', jobId: job.id, email: (u?.email as string | null) ?? null })
    return { ok: true, data: { url } }
  } catch (err) {
    console.error('Card checkout failed:', err)
    return { ok: false, error: 'Card payments aren’t available right now. Please pay by bank transfer.' }
  }
}

/** Test mode only: complete a pretend card payment. */
export async function mockCardPay(stageId: string, amountPence: number): Promise<R<{ jobId: string }>> {
  if (cardsMode() !== 'mock') return { ok: false, error: 'Test mode only.' }
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: st } = await s.admin.from('payment_stages').select('job_id').eq('id', stageId).maybeSingle()
  const { data: job } = await s.admin.from('jobs').select('client_user_id').eq('id', st?.job_id as string).maybeSingle()
  if (!st || job?.client_user_id !== s.userId) return { ok: false, error: 'Not found.' }
  const r = await recordPayment(s.admin, { stageId, amountPence, method: 'card', stripePaymentIntentId: `pi_mock_${Date.now()}`, stripeFeePence: Math.round(amountPence * 0.015) + 20 })
  return r.ok ? { ok: true, data: { jobId: st.job_id as string } } : r
}

/** Card refunds go through Stripe from the job page, with a credit note (PRD 9). */
export async function refundCardPayment(paymentId: string, amount: string): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const { data: p } = await s.admin.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (!p || p.method !== 'card' || !p.stripe_payment_intent_id) return { ok: false, error: 'Card payment not found.' }
  const { data: job } = await s.admin.from('jobs').select('trade_user_id').eq('id', p.job_id).maybeSingle()
  if (job?.trade_user_id !== s.userId) return { ok: false, error: 'Card payment not found.' }
  const { data: acc } = await s.admin.from('trade_card_accounts').select('stripe_account_id').eq('trade_id', s.userId).maybeSingle()
  const pence = parsePounds(amount)
  if (!pence || pence > p.amount_pence - p.refunded_pence) return { ok: false, error: 'Enter an amount up to what was paid.' }
  try {
    await refundCard(acc?.stripe_account_id as string, p.stripe_payment_intent_id, pence)
  } catch (err) {
    console.error('Card refund failed:', err)
    return { ok: false, error: 'Stripe could not make the refund. Try again or refund from your Stripe dashboard.' }
  }
  const now = new Date().toISOString()
  await s.admin.from('payments').update({ refunded_pence: p.refunded_pence + pence, refund_marked_at: now, refund_client_confirmed_at: now, status: p.refunded_pence + pence >= p.amount_pence ? 'refunded' : 'paid' }).eq('id', paymentId)
  await recordRefundCredit(s.admin, paymentId, pence)
  await logJobEvent(s.admin, p.job_id, 'refund', `Card refund of ${formatPence(pence)} through Stripe`, s.userId)
  revalidatePath(`/jobs/${p.job_id}`)
  return { ok: true }
}

/** Submit the evidence built from the job record, with the trade's own notes, to Stripe with one tap. */
export async function submitChargebackEvidence(chargebackId: string, note: string): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const { data: cb } = await s.admin.from('chargebacks').select('*').eq('id', chargebackId).maybeSingle()
  if (!cb || cb.trade_id !== s.userId) return { ok: false, error: 'Not found.' }
  if (cb.evidence_submitted_at) return { ok: false, error: 'Evidence already submitted.' }
  const { buildChargebackSummary } = await import('@/lib/cards/evidence')
  const summary = await buildChargebackSummary(s.admin, cb.job_id, note)
  const { data: acc } = await s.admin.from('trade_card_accounts').select('stripe_account_id').eq('trade_id', s.userId).maybeSingle()
  try {
    await submitDisputeEvidence(acc?.stripe_account_id as string, cb.stripe_dispute_id, summary)
  } catch (err) {
    console.error('Dispute evidence failed:', err)
    return { ok: false, error: 'Stripe did not accept the evidence. Try again, or submit it from your Stripe dashboard.' }
  }
  await s.admin.from('chargebacks').update({ evidence_note: note.trim().slice(0, 2000) || null, evidence_submitted_at: new Date().toISOString() }).eq('id', chargebackId)
  await s.admin.from('legal_documents').insert({ job_id: cb.job_id, type: 'chargeback_evidence', data: { summary: summary.summary }, sent_at: new Date().toISOString(), created_by: s.userId })
  await logJobEvent(s.admin, cb.job_id, 'chargeback_evidence', 'Chargeback evidence submitted to Stripe', s.userId)
  revalidatePath(`/jobs/${cb.job_id}`)
  return { ok: true }
}

/** Called on return from Stripe onboarding. */
export async function refreshCardAccount(): Promise<void> {
  const s = await getTradeSession()
  if (!s) return
  const { data: acc } = await s.admin.from('trade_card_accounts').select('stripe_account_id').eq('trade_id', s.userId).maybeSingle()
  if (!acc) return
  const st = await accountStatus(acc.stripe_account_id as string)
  await s.admin.from('trade_card_accounts').update({ charges_enabled: st.charges, payouts_enabled: st.payouts, updated_at: new Date().toISOString() }).eq('trade_id', s.userId)
}
