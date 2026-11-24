import { APP_URL } from '@/lib/app-url'
import * as v from '@/lib/email/templates-v42'
import * as s from '@/lib/sms/copy-v42'
import type { EmailSample, SmsSample } from './samples'

// v4.2 email and text samples for /admin/email-preview. Each phase adds its own.
const biz = 'Brown Leigh Construction'
const link = `${APP_URL}/open/sample`

export const EMAIL_SAMPLES_V42: EmailSample[] = [
  { id: 'Q1', group: 'v4.2 Quotes', label: 'Quote sent', to: 'Client', content: v.quoteSentEmail({ business: biz, title: 'Bathroom refit', totalPence: 640000, link, updated: false, validUntil: '24 December 2026' }) },
  { id: 'Q2', group: 'v4.2 Quotes', label: 'Quote updated (new version)', to: 'Client', content: v.quoteSentEmail({ business: biz, title: 'Bathroom refit', totalPence: 610000, link, updated: true, validUntil: '24 December 2026' }) },
  { id: 'Q3', group: 'v4.2 Quotes', label: 'Follow up: viewed', to: 'Client', content: v.quoteNudgeEmail({ business: biz, title: 'Bathroom refit', link, kind: 'viewed', expiresOn: '24 December' }) },
  { id: 'Q4', group: 'v4.2 Quotes', label: 'Follow up: never opened', to: 'Client', content: v.quoteNudgeEmail({ business: biz, title: 'Bathroom refit', link, kind: 'unopened', expiresOn: '24 December' }) },
  { id: 'Q5', group: 'v4.2 Quotes', label: 'Follow up: expiring', to: 'Client', content: v.quoteNudgeEmail({ business: biz, title: 'Bathroom refit', link, kind: 'expiring', expiresOn: '24 December' }) },
  { id: 'Q6', group: 'v4.2 Quotes', label: 'Deposit due', to: 'Client', content: v.depositDueEmail({ business: biz, title: 'Bathroom refit', depositPence: 80000, link, day: 0, expiresOn: '1 December' }) },
  { id: 'Q7', group: 'v4.2 Quotes', label: 'Deposit reminder', to: 'Client', content: v.depositDueEmail({ business: biz, title: 'Bathroom refit', depositPence: 80000, link, day: 3, expiresOn: '1 December' }) },
  { id: 'Q8', group: 'v4.2 Quotes', label: 'Quote expired (deposit)', to: 'Client', content: v.quoteExpiredClientEmail({ business: biz, title: 'Bathroom refit', reason: 'deposit' }) },
  { id: 'Q9', group: 'v4.2 Quotes', label: 'Quote accepted', to: 'Trade', content: v.tradeQuoteEventEmail({ title: 'Bathroom refit', client: 'Sam Miller', event: 'accepted', jobId: 'sample' }) },
  { id: 'Q10', group: 'v4.2 Quotes', label: 'Changes asked for', to: 'Trade', content: v.tradeQuoteEventEmail({ title: 'Bathroom refit', client: 'Sam Miller', event: 'changes', jobId: 'sample', note: 'Can you price it without the vanity unit?' }) },
]

export const SMS_SAMPLES_V42: SmsSample[] = [
  { id: 'QS1', label: 'Quote sent', to: 'Client', text: s.smsQuoteSent(biz, link, false) },
  { id: 'QS2', label: 'Quote updated', to: 'Client', text: s.smsQuoteSent(biz, link, true) },
  { id: 'QS3', label: 'Quote reminder', to: 'Client', text: s.smsQuoteNudge(biz, link) },
  { id: 'QS4', label: 'Deposit due', to: 'Client', text: s.smsDepositDue(biz, link) },
]
