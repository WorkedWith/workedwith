// Client facing wording for quotes. Plain English, no dashes. Final wording is part of the solicitor
// review (PRD 19 item 3); every string lives here so it can be changed in one place.

import { formatPence } from '@/lib/money'
import type { ClientKind, DepositFor, NonRefundableFrom, PlannedStartType, TermsSnapshot } from '@/types/v42'

export const STANDARD_TERMS_VERSION = '2026-11-v1'

export const STANDARD_TERMS = [
  'These are the WorkedWith standard terms between you and the trade. WorkedWith is not a party to the job.',
  'Price. The price is as shown on the quote. Extra work is only done and charged if you approve a variation in your WorkedWith account before it is done.',
  'Paying. You pay the trade directly, by bank transfer to the details on each invoice using the invoice number as the reference, or by card where the trade offers it. Each stage is due within the payment terms on its invoice once it is approved, or once the trade requests payment after a stage has been waiting 14 days.',
  'Stages. When the trade marks a stage done you can approve it or raise an issue in your account. Nothing is ever approved for you.',
  'Start dates. Start dates are planned, not guaranteed. A change is agreed between you in your accounts.',
  'Cancelling. Either side can cancel with a reason. Amounts already due stay due. What happens to a deposit is shown on the quote.',
  'Late payment. If a stage is not paid on time the trade may send reminders through WorkedWith and may take further steps to recover the money.',
  'Records. Your quote, approvals, invoices and payments are kept for 6 years. Both sides can review each other once the job is paid, a payment is 30 days overdue, or the job is cancelled after work started.',
].join('\n\n')

export const CANCELLATION_NOTICE = [
  'Your right to cancel. You have 14 days from the day you accept this quote to cancel it without giving a reason.',
  'To cancel, use the Cancel button on the job in your WorkedWith account, or tell the trade clearly in writing.',
  'If you cancel within the 14 days you get back any deposit you have paid, unless materials made to measure or made to order for you have already been ordered.',
  'If you asked for work to start within the 14 days and then cancel, you may have to pay for work already done.',
].join('\n\n')

export const EARLY_START_CONSENT =
  'I ask for the work to start within my 14 day cancellation period. I understand that if I cancel I may have to pay for work already done.'

const FOR_LABEL: Record<DepositFor, string> = {
  materials: 'Deposit for materials',
  labour: 'Deposit for labour',
  materials_and_labour: 'Deposit for materials and labour',
}

const FROM_LABEL: Record<NonRefundableFrom, string> = {
  materials_ordered: 'once materials are ordered',
  work_started: 'once work starts',
  payment: 'from payment',
}

/** "Deposit for materials: £800. Non refundable once materials are ordered." (PRD 6) */
export function depositWording(d: {
  amountPence: number
  for: DepositFor | null
  refundable: boolean
  nonRefundableFrom: NonRefundableFrom | null
  clientKind: ClientKind
}): string {
  const label = d.for ? FOR_LABEL[d.for] : 'Deposit'
  const base = `${label}: ${formatPence(d.amountPence)}.`
  if (d.refundable || !d.nonRefundableFrom) return `${base} Refundable.`
  const person = d.clientKind === 'person'
    ? ' If you cancel within your 14 day cancellation period it is refunded, unless made to measure materials have been ordered.'
    : ''
  return `${base} Non refundable ${FROM_LABEL[d.nonRefundableFrom]}.${person}`
}

/** Note shown to the trade when picking non refundable for a person client (PRD 6). */
export const PERSON_NON_REFUNDABLE_NOTE =
  'For a person client, the deposit is still refundable if they cancel within their 14 day cancellation period, unless the materials are made to measure or made to order and already ordered. A non refundable deposit only holds up where it reflects real costs you have taken on.'

export function plannedStartWording(type: PlannedStartType, date: string | null): string {
  if (type === 'asap') return 'Planned start: as soon as possible'
  if (type === 'date' && date) return `Planned start: ${new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
  return 'Start date to be agreed'
}

/**
 * Person clients only: the start within 14 days consent is asked at acceptance when the planned start is
 * as soon as possible or a date inside the 14 days (PRD 7).
 */
export function needsEarlyStartConsentAtAcceptance(kind: ClientKind, type: PlannedStartType, date: string | null, acceptAt = new Date()): boolean {
  if (kind !== 'person') return false
  if (type === 'asap') return true
  if (type === 'date' && date) return new Date(date).getTime() < acceptAt.getTime() + 14 * 86_400_000
  return false
}

export function buildTermsSnapshot(p: {
  extraTerms: string | null
  clientKind: ClientKind
  depositWording: string | null
  earlyStartAsked: boolean
}): TermsSnapshot {
  return {
    standardTermsVersion: STANDARD_TERMS_VERSION,
    standardTerms: STANDARD_TERMS,
    extraTerms: p.extraTerms,
    cancellationNotice: p.clientKind === 'person' ? CANCELLATION_NOTICE : null,
    depositWording: p.depositWording,
    earlyStartConsentWording: p.earlyStartAsked ? EARLY_START_CONSENT : null,
  }
}
