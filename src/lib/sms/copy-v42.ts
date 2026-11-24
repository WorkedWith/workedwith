// v4.2 texts. One way, action only, worded from the trade's business (PRD 17, 22). No dashes.

export const smsQuoteSent = (business: string, link: string, updated: boolean) =>
  updated
    ? `${business} has updated your quote. See it and accept again: ${link}`
    : `${business} has sent you a quote on WorkedWith. See it here: ${link}`

export const smsQuoteNudge = (business: string, link: string) => `Reminder: your quote from ${business} is waiting. ${link}`

export const smsDepositDue = (business: string, link: string) => `${business}: your deposit is due to book the job in. Details: ${link}`
