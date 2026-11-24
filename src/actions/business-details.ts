'use server'

import { revalidatePath } from 'next/cache'
import { getTradeSession } from '@/lib/auth/require-trade'
import { cleanPrefix, UK_VAT_RE } from '@/lib/business-details'

export type BusinessDetailsInput = {
  companyName: string
  tradingAddress: string
  businessEmail: string
  businessPhone: string
  replyEmail: string
  vatNumber: string
  invoicePrefix: string
  paymentTermsDays: number
  partPaymentsEnabled: boolean
  defaultDepositFor: '' | 'materials' | 'labour' | 'materials_and_labour'
  defaultDepositRefundable: boolean
  defaultNonRefundableFrom: '' | 'materials_ordered' | 'work_started' | 'payment'
  extraTerms: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function saveBusinessDetails(input: BusinessDetailsInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getTradeSession()
  if (!session) return { ok: false, error: 'Please sign in as a trade.' }

  const companyName = input.companyName.trim().slice(0, 120)
  const businessEmail = input.businessEmail.trim().toLowerCase()
  const replyEmail = input.replyEmail.trim().toLowerCase()
  const vat = input.vatNumber.replace(/\s/g, '').toUpperCase()
  const prefix = cleanPrefix(input.invoicePrefix)
  const terms = Math.round(Number(input.paymentTermsDays))

  if (!companyName) return { ok: false, error: 'Enter your business name.' }
  if (businessEmail && !EMAIL_RE.test(businessEmail)) return { ok: false, error: 'That business email does not look right.' }
  if (replyEmail && !EMAIL_RE.test(replyEmail)) return { ok: false, error: 'That reply email does not look right.' }
  if (vat && !UK_VAT_RE.test(vat)) return { ok: false, error: 'A UK VAT number is 9 numbers, sometimes starting GB.' }
  if (!prefix) return { ok: false, error: 'The invoice prefix should be 1 to 6 letters or numbers.' }
  if (!Number.isFinite(terms) || terms < 0 || terms > 30) return { ok: false, error: 'Payment terms can be 0 to 30 days.' }
  if (input.defaultNonRefundableFrom === 'payment') {
    // Non refundable from payment is only for company clients, so it can't be the default for everyone
    return { ok: false, error: 'Non refundable from payment can only be picked on a quote to a company client.' }
  }

  // The invoice prefix can't change once an invoice has been issued, so numbering stays sequential
  const { data: current } = await session.admin.from('trade_profiles').select('invoice_prefix, next_invoice_number').eq('user_id', session.userId).maybeSingle()
  if (current?.invoice_prefix && current.invoice_prefix !== prefix && (current.next_invoice_number ?? 1) > 1) {
    return { ok: false, error: 'Your invoice prefix can’t change after your first invoice.' }
  }

  const { error } = await session.admin
    .from('trade_profiles')
    .update({
      company_name: companyName,
      trading_address: input.tradingAddress.trim().slice(0, 300) || null,
      business_email: businessEmail || null,
      business_phone: input.businessPhone.trim().slice(0, 30) || null,
      reply_email: replyEmail || null,
      vat_number: vat || null,
      invoice_prefix: prefix,
      payment_terms_days: terms,
      part_payments_enabled: input.partPaymentsEnabled,
      default_deposit_for: input.defaultDepositFor || null,
      default_deposit_refundable: input.defaultDepositRefundable,
      default_non_refundable_from: input.defaultNonRefundableFrom || null,
      extra_terms: input.extraTerms.trim().slice(0, 4000) || null,
    })
    .eq('user_id', session.userId)
  if (error) return { ok: false, error: 'We could not save your details. Please try again.' }
  revalidatePath('/profile/business')
  return { ok: true }
}
