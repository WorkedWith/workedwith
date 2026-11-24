// v4.2 texts. One way, action only, worded from the trade's business (PRD 17, 22). No dashes.

export const smsQuoteSent = (business: string, link: string, updated: boolean) =>
  updated
    ? `${business} has updated your quote. See it and accept again: ${link}`
    : `${business} has sent you a quote on WorkedWith. See it here: ${link}`

export const smsQuoteNudge = (business: string, link: string) => `Reminder: your quote from ${business} is waiting. ${link}`

export const smsDepositDue = (business: string, link: string) => `${business}: your deposit is due to book the job in. Details: ${link}`

export const smsStartProposed = (business: string, date: string, link: string) => `${business} suggests a planned start of ${date}. Confirm or suggest another: ${link}`
export const smsConsentRequested = (business: string, link: string) => `${business} would like to start within your 14 day cancellation period. Answer here: ${link}`

export const smsInvoiceIssued = (business: string, number: string, link: string) => `${business}: invoice ${number} is ready. Bank details and reference: ${link}`
export const smsStageDone = (business: string, stage: string, link: string) => `${business} has marked ${stage} done. Please approve it or raise an issue: ${link}`
export const smsApprovalReminder = (business: string, stage: string, link: string) => `${business} is waiting for your approval of ${stage}: ${link}`
export const smsPaymentRequested = (business: string, stage: string, link: string) => `${business} has requested payment for ${stage}. Not approved by you. Details: ${link}`

export const smsVariation = (business: string, link: string) => `${business} has sent a change to your job for you to approve before the work: ${link}`

export const smsChase = (business: string, step: string, number: string, link: string) => ({
  heads_up: `${business}: invoice ${number} is due soon. Details: ${link}`,
  due_today: `${business}: invoice ${number} is due today. Details: ${link}`,
  late_1: `${business}: invoice ${number} is overdue. Please pay now: ${link}`,
  late_2: `${business}: second notice, invoice ${number} is overdue. ${link}`,
  final: `${business}: final notice for invoice ${number}. Please pay within 7 days: ${link}`,
}[step] ?? `${business}: invoice ${number}. ${link}`)
