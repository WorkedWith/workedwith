// v4.2 emails (quotes to paid). Kept apart from templates.ts so the new platform's wording is in one place.
// Plain English, no dashes. Messages to clients are sent in the trade's name by messageClient().

import { APP_URL } from '@/lib/app-url'
import { formatPence } from '@/lib/money'
import type { EmailContent } from '@/lib/email/layout'

const url = (path: string) => (path.startsWith('http') ? path : `${APP_URL}${path}`)

// ── Quotes to clients ─────────────────────────────────────────

export function quoteSentEmail(p: { business: string; title: string; totalPence: number; link: string; updated: boolean; validUntil: string }): EmailContent {
  return {
    subject: p.updated ? `${p.business} has updated your quote` : `Your quote from ${p.business}`,
    preheader: `${p.title}: ${formatPence(p.totalPence)}`,
    heading: p.updated ? 'Your quote has been updated' : `Your quote from ${p.business}`,
    paragraphs: [
      `**${p.title}**: ${formatPence(p.totalPence)}.`,
      p.updated
        ? 'This is a new version, so please have a look and accept it again if you are happy.'
        : 'Open it on your phone to see what is included, how payment works and the planned start. You can accept, ask for changes or decline.',
      `The quote is valid until ${p.validUntil}.`,
    ],
    button: { label: 'See my quote', url: url(p.link) },
    small: ['You will get a text code to open it. No password or app needed.'],
  }
}

export function quoteNudgeEmail(p: { business: string; title: string; link: string; kind: 'viewed' | 'unopened' | 'expiring'; expiresOn: string }): EmailContent {
  const lines: Record<typeof p.kind, string> = {
    viewed: `Just a reminder about your quote for **${p.title}**. You can accept it, ask for changes or decline from your account.`,
    unopened: `${p.business} sent you a quote for **${p.title}**. You have not opened it yet.`,
    expiring: `Your quote for **${p.title}** expires on ${p.expiresOn}.`,
  }
  return {
    subject: p.kind === 'expiring' ? `Your quote from ${p.business} expires soon` : `Your quote from ${p.business}`,
    heading: p.kind === 'expiring' ? 'Your quote expires soon' : 'A reminder about your quote',
    paragraphs: [lines[p.kind]],
    button: { label: 'See my quote', url: url(p.link) },
  }
}

export function depositDueEmail(p: { business: string; title: string; depositPence: number; link: string; day: 0 | 1 | 3 | 6; expiresOn: string }): EmailContent {
  return {
    subject: p.day === 0 ? `Deposit to book in: ${p.title}` : `Reminder: deposit to book in ${p.title}`,
    heading: p.day === 0 ? 'Thanks for accepting' : 'Your deposit is still to pay',
    paragraphs: [
      p.day === 0
        ? `Thanks for accepting the quote for **${p.title}**. ${p.business} asked for a deposit of ${formatPence(p.depositPence)} to book the job in.`
        : `The deposit of ${formatPence(p.depositPence)} for **${p.title}** has not arrived yet.`,
      `Pay it by bank transfer using the details and reference on the invoice. If it is not paid by ${p.expiresOn}, the quote expires.`,
    ],
    button: { label: 'Pay the deposit', url: url(p.link) },
  }
}

export function quoteExpiredClientEmail(p: { business: string; title: string; reason: 'validity' | 'deposit' }): EmailContent {
  return {
    subject: `Your quote from ${p.business} has expired`,
    heading: 'Your quote has expired',
    paragraphs: [
      p.reason === 'deposit'
        ? `The deposit for **${p.title}** was not paid in time, so the quote has expired.`
        : `The quote for **${p.title}** has passed its valid until date.`,
      `If you still want the work done, contact ${p.business} and they can send a new quote.`,
    ],
  }
}

// ── Quotes to trades ─────────────────────────────────────────

export function tradeQuoteEventEmail(p: { title: string; client: string; event: 'viewed' | 'accepted' | 'declined' | 'expired' | 'changes' | 'deposit_expired'; jobId: string; note?: string | null }): EmailContent {
  const text: Record<typeof p.event, string> = {
    viewed: `${p.client} has opened your quote for **${p.title}**.`,
    accepted: `${p.client} has accepted your quote for **${p.title}**.`,
    declined: `${p.client} has declined your quote for **${p.title}**.`,
    expired: `Your quote for **${p.title}** to ${p.client} has expired.`,
    changes: `${p.client} has asked for changes to your quote for **${p.title}**.`,
    deposit_expired: `The deposit for **${p.title}** was not paid by day 7, so the quote has expired. You can extend the deadline from the job.`,
  }
  const subject: Record<typeof p.event, string> = {
    viewed: `${p.client} opened your quote`,
    accepted: `Quote accepted: ${p.title}`,
    declined: `Quote declined: ${p.title}`,
    expired: `Quote expired: ${p.title}`,
    changes: `Changes asked for: ${p.title}`,
    deposit_expired: `Deposit not paid: ${p.title}`,
  }
  return {
    subject: subject[p.event],
    heading: subject[p.event],
    paragraphs: [text[p.event]],
    ...(p.note ? { quote: { label: p.event === 'declined' ? 'Their reason' : 'What they asked', text: p.note } } : {}),
    button: { label: 'Open the job', url: url(`/jobs/${p.jobId}`) },
  }
}
