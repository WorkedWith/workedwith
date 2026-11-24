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

// ── Job events (phase 4) ──────────────────────────────────────

export function jobEventClientEmail(p: { business: string; title: string; link: string; event: 'start_proposed' | 'start_confirmed' | 'materials_ordered' | 'consent_requested' | 'started'; date?: string }): EmailContent {
  const map = {
    start_proposed: { s: `${p.business} has suggested a planned start`, b: `${p.business} has suggested a planned start of **${p.date}** for ${p.title}. Confirm it, or suggest another date, in your account.`, btn: 'Confirm or suggest a date' },
    start_confirmed: { s: `Planned start agreed: ${p.date}`, b: `The planned start for ${p.title} is ${p.date}.`, btn: 'See your job' },
    materials_ordered: { s: 'Your materials have been ordered', b: `${p.business} has ordered the materials for ${p.title}.`, btn: 'See your job' },
    consent_requested: { s: 'Can the work start within your 14 days?', b: `${p.business} would like to start ${p.title} within your 14 day cancellation period. If you are happy for it to, say so in your account. If you then cancel you may have to pay for work already done.`, btn: 'Answer in your account' },
    started: { s: `Work has started: ${p.title}`, b: `${p.business} has marked ${p.title} as started.`, btn: 'See your job' },
  }[p.event]
  return { subject: map.s, heading: map.s, paragraphs: [map.b], button: { label: map.btn, url: url(p.link) } }
}

export function jobEventTradeEmail(p: { client: string; title: string; jobId: string; event: 'start_confirmed' | 'start_countered' | 'consent_given'; date?: string }): EmailContent {
  const map = {
    start_confirmed: { s: `Start date confirmed: ${p.date}`, b: `${p.client} confirmed the planned start of ${p.date} for ${p.title}.` },
    start_countered: { s: `${p.client} suggested another date`, b: `${p.client} suggested a planned start of ${p.date} for ${p.title}. Accept it or suggest another from the job.` },
    consent_given: { s: 'Early start agreed', b: `${p.client} has asked for ${p.title} to start within their 14 day cancellation period. You can now mark the job started.` },
  }[p.event]
  return { subject: map.s, heading: map.s, paragraphs: [map.b], button: { label: 'Open the job', url: url(`/jobs/${p.jobId}`) } }
}

// ── Stages, invoices and payments (phase 5) ───────────────────

type Payee = { accountName: string; sortCode: string; accountNumber: string } | null

function payLines(payee: Payee, reference: string): string[] {
  if (!payee) return [`Use **${reference}** as the payment reference.`]
  return [
    'Pay by bank transfer to:',
    `Account name: **${payee.accountName}**`,
    `Sort code: **${payee.sortCode.replace(/^(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3')}**`,
    `Account number: **${payee.accountNumber}**`,
    `Reference: **${reference}**`,
  ]
}

export function invoiceIssuedEmail(p: { business: string; invoiceNumber: string; description: string; totalPence: number; dueAt: string; link: string; payee: Payee; requestedByTrade: boolean }): EmailContent {
  return {
    subject: `Invoice ${p.invoiceNumber} from ${p.business}`,
    heading: `Invoice ${p.invoiceNumber}`,
    paragraphs: [
      `${p.description}: **${formatPence(p.totalPence)}**, due by ${new Date(p.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`,
      ...(p.requestedByTrade ? ['Payment requested by the trade. Not approved by the client. You can still approve the stage or keep your issue open in your account.'] : []),
      ...payLines(p.payee, p.invoiceNumber),
    ],
    button: { label: 'See the invoice', url: url(p.link) },
  }
}

export function stageEventClientEmail(p: { business: string; title: string; stage: string; link: string; event: 'done' | 'reminder' | 'requested' | 'issue_reply'; day?: number }): EmailContent {
  const map = {
    done: { s: `Please check: ${p.stage}`, b: `${p.business} has marked **${p.stage}** on ${p.title} as done, with photos. Approve it, or raise an issue, in your account.` },
    reminder: { s: `Waiting for your approval: ${p.stage}`, b: `${p.business} is waiting for you to approve **${p.stage}** on ${p.title}${p.day ? ` (${p.day} days so far)` : ''}. Nothing is ever approved for you. Approve it, or raise an issue if something isn't right.` },
    requested: { s: `Payment requested: ${p.stage}`, b: `${p.business} has requested payment for **${p.stage}** on ${p.title}. This is labelled "Payment requested by the trade. Not approved by the client". You can still approve it, or keep your issue open.` },
    issue_reply: { s: `${p.business} replied about ${p.stage}`, b: `${p.business} has replied to the issue you raised on **${p.stage}**.` },
  }[p.event]
  return { subject: map.s, heading: map.s, paragraphs: [map.b], button: { label: 'Open the job', url: url(p.link) } }
}

export function stageEventTradeEmail(p: { client: string; title: string; stage: string; jobId: string; event: 'approved' | 'issue' | 'issue_reply' | 'stalled' | 'client_says_paid'; note?: string | null }): EmailContent {
  const map = {
    approved: { s: `Approved: ${p.stage}`, b: `${p.client} approved **${p.stage}** on ${p.title}. The invoice has been issued.` },
    issue: { s: `Issue raised: ${p.stage}`, b: `${p.client} raised an issue on **${p.stage}** on ${p.title}. Chasing on this stage is paused until you resubmit it or request payment.` },
    issue_reply: { s: `${p.client} replied about ${p.stage}`, b: `${p.client} added a note to the issue on **${p.stage}**.` },
    stalled: { s: `You can now request payment: ${p.stage}`, b: `**${p.stage}** on ${p.title} has waited 14 days. You can now request payment anyway. It will always show as not approved by the client.` },
    client_says_paid: { s: `${p.client} says they have paid`, b: `${p.client} says they have paid for **${p.stage}**. Chasing is paused for up to 3 working days while the money arrives.` },
  }[p.event]
  return { subject: map.s, heading: map.s, paragraphs: [map.b], ...(p.note ? { quote: { label: 'Their note', text: p.note } } : {}), button: { label: 'Open the job', url: url(`/jobs/${p.jobId}`) } }
}

export function receiptEmail(p: { business: string; invoiceNumber: string; amountPence: number; balancePence: number; method: string; link: string; depositNote?: string | null }): EmailContent {
  return {
    subject: `Receipt: ${formatPence(p.amountPence)} to ${p.business}`,
    heading: 'Payment received',
    paragraphs: [
      `${p.business} has received **${formatPence(p.amountPence)}** for invoice ${p.invoiceNumber}, paid by ${p.method}.`,
      p.balancePence > 0 ? `${formatPence(p.balancePence)} is still to pay on this invoice.` : 'This invoice is now paid in full.',
      ...(p.depositNote ? [p.depositNote] : []),
    ],
    button: { label: 'See your job', url: url(p.link) },
  }
}

export function paymentTradeEmail(p: { client: string; amountPence: number; invoiceNumber: string; jobId: string; event: 'received' | 'part' | 'suggested' | 'overpaid'; payer?: string | null }): EmailContent {
  const map = {
    received: { s: `Paid: ${p.invoiceNumber}`, b: `${formatPence(p.amountPence)} from ${p.client} has arrived and invoice ${p.invoiceNumber} is marked paid.` },
    part: { s: `Part payment: ${p.invoiceNumber}`, b: `${formatPence(p.amountPence)} from ${p.client} has arrived for invoice ${p.invoiceNumber}. The balance is still being chased.` },
    suggested: { s: 'Is this payment for one of your invoices?', b: `${formatPence(p.amountPence)} from ${p.payer ?? 'someone'} has arrived without a matching reference. Is this invoice ${p.invoiceNumber}? Nothing is marked paid until you confirm.` },
    overpaid: { s: `Overpayment: ${p.invoiceNumber}`, b: `${p.client} paid ${formatPence(p.amountPence)} against invoice ${p.invoiceNumber}, which is more than the balance. Check it and refund any extra.` },
  }[p.event]
  return { subject: map.s, heading: map.s, paragraphs: [map.b], button: { label: 'Open the job', url: url(`/jobs/${p.jobId}`) } }
}

export function confirmPaymentClientEmail(p: { business: string; amountPence: number; method: string; link: string; kind: 'paid_elsewhere' | 'refund' }): EmailContent {
  return {
    subject: p.kind === 'refund' ? `Please confirm your refund from ${p.business}` : `Please confirm a payment to ${p.business}`,
    heading: p.kind === 'refund' ? 'Did you get your refund?' : 'Please confirm this payment',
    paragraphs: [
      p.kind === 'refund'
        ? `${p.business} says they have refunded you **${formatPence(p.amountPence)}**. Please confirm once it has arrived.`
        : `${p.business} has marked **${formatPence(p.amountPence)}** as paid by ${p.method}. Please confirm it, or tell them if you didn't pay that way.`,
    ],
    button: { label: 'Confirm in your account', url: url(p.link) },
  }
}

export function jobCancelledEmail(p: { who: string; title: string; reason: string; link: string; depositNote: string | null }): EmailContent {
  return {
    subject: `Job cancelled: ${p.title}`,
    heading: 'This job has been cancelled',
    paragraphs: [`${p.who} cancelled **${p.title}**.`, 'Any amounts already due stay due. Stages not started are cancelled.', ...(p.depositNote ? [p.depositNote] : [])],
    quote: { label: 'Reason', text: p.reason },
    button: { label: 'See the job', url: url(p.link) },
  }
}

// ── Variations (phase 7) ──────────────────────────────────────

export function variationClientEmail(p: { business: string; title: string; description: string; amountPence: number; link: string }): EmailContent {
  const add = p.amountPence > 0
  return {
    subject: `Please approve a change: ${p.description}`,
    heading: 'A change to your job',
    paragraphs: [
      `${p.business} has sent a change to **${p.title}** for you to approve before the work is done.`,
      `**${p.description}**: ${add ? 'adds' : 'takes off'} ${formatPence(Math.abs(p.amountPence))}.`,
      'Approve or decline it in your account.',
    ],
    button: { label: 'See the change', url: url(p.link) },
  }
}

export function variationTradeEmail(p: { client: string; description: string; jobId: string; approved: boolean; note?: string | null }): EmailContent {
  return {
    subject: `${p.approved ? 'Approved' : 'Declined'}: ${p.description}`,
    heading: `Variation ${p.approved ? 'approved' : 'declined'}`,
    paragraphs: [`${p.client} ${p.approved ? 'approved' : 'declined'} the variation **${p.description}**.`],
    ...(p.note ? { quote: { label: 'Their note', text: p.note } } : {}),
    button: { label: 'Open the job', url: url(`/jobs/${p.jobId}`) },
  }
}

// ── Chasing (phase 8). Firm but accurate: never threaten anything the trade can't or won't do. ──

export type ChaseCopyStep = 'heads_up' | 'due_today' | 'late_1' | 'late_2' | 'final'

export function chaseEmail(p: { step: ChaseCopyStep; business: string; invoiceNumber: string; balancePence: number; dueOn: string; link: string; payee: Payee; requestedByTrade: boolean }): EmailContent {
  const amt = formatPence(p.balancePence)
  const copy: Record<ChaseCopyStep, { s: string; h: string; b: string }> = {
    heads_up: { s: `Invoice ${p.invoiceNumber} is due on ${p.dueOn}`, h: 'A friendly heads up', b: `Invoice ${p.invoiceNumber} from ${p.business} for **${amt}** is due on ${p.dueOn}.` },
    due_today: { s: `Invoice ${p.invoiceNumber} is due today`, h: 'Payment due today', b: `Invoice ${p.invoiceNumber} from ${p.business} for **${amt}** is due today.` },
    late_1: { s: `Late payment: invoice ${p.invoiceNumber}`, h: 'Your payment is late', b: `Invoice ${p.invoiceNumber} from ${p.business} for **${amt}** was due on ${p.dueOn} and has not been paid. Please pay it now.` },
    late_2: { s: `Second notice: invoice ${p.invoiceNumber} is overdue`, h: 'Second late payment notice', b: `Invoice ${p.invoiceNumber} from ${p.business} for **${amt}** is now a week overdue. Please pay it now, or reply to this email if there is a problem.` },
    final: { s: `Final notice: invoice ${p.invoiceNumber}`, h: 'Final notice', b: `Invoice ${p.invoiceNumber} from ${p.business} for **${amt}** is 14 days overdue. Please pay within 7 days. If it is not paid, ${p.business} may start formal steps to recover the money.` },
  }
  const c = copy[p.step]
  return {
    subject: c.s,
    heading: c.h,
    paragraphs: [
      c.b,
      ...(p.requestedByTrade ? ['Payment requested by the trade. Not approved by the client.'] : []),
      ...payLines(p.payee, p.invoiceNumber),
      'If you have already paid, thank you. Tap "I’ve paid" in your account so the reminders pause while the money arrives.',
    ],
    button: { label: 'See the invoice', url: url(p.link) },
  }
}

export function lbaPromptTradeEmail(p: { client: string; invoiceNumber: string; balancePence: number; jobId: string }): EmailContent {
  return {
    subject: `Invoice ${p.invoiceNumber} is 21 days overdue`,
    heading: 'You can now send a letter before action',
    paragraphs: [
      `${p.client} still owes **${formatPence(p.balancePence)}** on invoice ${p.invoiceNumber}, now 21 days overdue.`,
      'You can preview a letter before action made from the job record and send it with one tap. WorkedWith does not collect debts or file claims; you decide what to do next.',
    ],
    button: { label: 'Preview the letter', url: url(`/jobs/${p.jobId}/letter`) },
  }
}

export function lbaClientEmail(p: { business: string; balancePence: number; respondBy: string; link: string }): EmailContent {
  return {
    subject: `Letter before action from ${p.business}`,
    heading: 'Letter before action',
    paragraphs: [
      `${p.business} has sent you a letter before action about **${formatPence(p.balancePence)}** owed on your job.`,
      `Please read it and respond by **${p.respondBy}**. You can pay, or reply using the details in the letter.`,
    ],
    button: { label: 'Read the letter', url: url(p.link) },
  }
}

// ── Reviews (phase 9) ─────────────────────────────────────────

export function reviewWindowEmail(p: { other: string; title: string; link: string; kind: 'open' | 'reminder' | 'published'; closesOn: string }): EmailContent {
  const map = {
    open: { s: `You can now review ${p.other}`, b: `The job **${p.title}** is ready for reviews. You both have until ${p.closesOn}. Neither review shows until both are in or the 14 days end, then they publish together.` },
    reminder: { s: `Reminder: review ${p.other}`, b: `You have until ${p.closesOn} to review ${p.other} for **${p.title}**. If only one review is in when the window closes, it publishes on its own.` },
    published: { s: 'Reviews published', b: `The reviews for **${p.title}** are now published.` },
  }[p.kind]
  return { subject: map.s, heading: map.s, paragraphs: [map.b], button: { label: p.kind === 'published' ? 'See the reviews' : 'Write my review', url: url(p.link) } }
}

// ── Seeded outreach (phase 12). Limited companies only, with a clear opt out every time. ──

export type SeededStep = 'day0' | 'day30' | 'day60' | 'day80'

export function seededEmailV42(p: { step: SeededStep; name: string; claimUrl: string; removeUrl: string; removesOn: string; views: number; emails: number }): EmailContent {
  const activity = p.views || p.emails
    ? `${p.views} ${p.views === 1 ? 'person' : 'people'} near you viewed your profile this month${p.emails ? ` and ${p.emails} clicked to email you` : ''}.`
    : null
  const pitch = 'WorkedWith is where trades quote, get approval and get paid in one place: clients accept in their own account, pay by bank transfer with no transaction fees, late payments are chased for you, and every paid job builds your reputation. It is free for 30 days, then £19.99 a month.'
  const map: Record<SeededStep, { s: string; h: string; b: string[] }> = {
    day0: { s: `We listed ${p.name} on WorkedWith`, h: `${p.name} is listed on WorkedWith`, b: [`We added **${p.name}** to WorkedWith from public business information, so local clients can find you. It says you are not on WorkedWith yet and have no reviews.`, pitch] },
    day30: { s: `Your WorkedWith listing for ${p.name}`, h: 'Your listing is getting seen', b: [activity ?? `Your listing for **${p.name}** is live for clients near you.`, pitch] },
    day60: { s: `${p.name}: your free listing ends on ${p.removesOn}`, h: `Your listing ends on ${p.removesOn}`, b: [activity ?? `Your listing for **${p.name}** is still unclaimed.`, `Claim it before ${p.removesOn} to keep it and start your free trial.`] },
    day80: { s: `Last reminder: ${p.name} is removed on ${p.removesOn}`, h: 'This is our last email', b: [activity ?? `The listing for **${p.name}** is removed on ${p.removesOn} unless you claim it.`, 'If WorkedWith is not for you, do nothing and it goes.'] },
  }
  const m = map[p.step]
  return {
    subject: m.s,
    heading: m.h,
    paragraphs: m.b,
    button: { label: 'Claim my listing', url: p.claimUrl },
    stranger: { why: `${p.name} is a limited company listed publicly at Companies House.`, removeUrl: p.removeUrl },
  }
}

// ── Cards and chargebacks (phase 13) ──────────────────────────

export function chargebackTradeEmail(p: { amountPence: number; jobId: string; dueOn: string | null; reminder: boolean }): EmailContent {
  return {
    subject: p.reminder ? 'Chargeback evidence is due in 3 days' : 'A client has disputed a card payment',
    heading: p.reminder ? 'Evidence due in 3 days' : 'Card payment disputed',
    paragraphs: [
      p.reminder
        ? `The evidence for the disputed ${formatPence(p.amountPence)} card payment is due by ${p.dueOn}.`
        : `A client has disputed a ${formatPence(p.amountPence)} card payment with their bank. Stripe has opened a dispute on your Stripe account.`,
      'We have built the evidence from the job record: the accepted quote and terms, approvals, variations, photos, invoices and reminders. Review it, add anything you want, and submit it with one tap.',
    ],
    button: { label: 'Review the evidence', url: url(`/jobs/${p.jobId}`) },
  }
}
