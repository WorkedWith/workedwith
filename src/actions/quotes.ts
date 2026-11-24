'use server'

import { revalidatePath } from 'next/cache'
import { getTradeSession, getUserSession } from '@/lib/auth/require-trade'
import { hasActivePlan } from '@/lib/plan'
import { hasBankDetails } from '@/lib/getting-paid/bank-account'
import { normaliseUkMobile } from '@/lib/phone'
import { quoteProblems, type QuoteDraftInput } from '@/lib/quotes/calc'
import { createStagesFromQuote, loadQuote, persistDraft } from '@/lib/quotes/service'
import { buildTermsSnapshot, depositWording, needsEarlyStartConsentAtAcceptance } from '@/lib/quotes/wording'
import { createAccessLink, ensureClientAccount } from '@/lib/clients/accounts'
import { getTradeSender, messageClient, messageTrade } from '@/lib/messages/send'
import { depositDueEmail, quoteSentEmail, tradeQuoteEventEmail } from '@/lib/email/templates-v42'
import { smsDepositDue, smsQuoteSent } from '@/lib/sms/copy-v42'
import { onStageDue } from '@/lib/jobs/hooks'
import { storeJobPhoto } from '@/lib/photos'
import { recordClientRecordView } from '@/lib/client-record/views'

type R<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function tradeContext() {
  const s = await getTradeSession()
  if (!s) return null
  const { data: tp } = await s.admin.from('trade_profiles').select('vat_number, trade_types').eq('user_id', s.userId).maybeSingle()
  return {
    ...s,
    trade: {
      vatRegistered: !!tp?.vat_number,
      tradeProfileId: s.tradeProfileId,
      jobType: ((tp?.trade_types as string[] | null) ?? [])[0] ?? 'General',
    },
  }
}

// ── Trade ─────────────────────────────────────────────────────

export async function saveQuoteDraft(input: QuoteDraftInput): Promise<R<{ quoteId: string; jobId: string }>> {
  const ctx = await tradeContext()
  if (!ctx) return { ok: false, error: 'Please sign in as a trade.' }
  const r = await persistDraft(ctx.admin, ctx.userId, input, ctx.trade)
  if (!r.ok) return r
  return { ok: true, data: { quoteId: r.quoteId, jobId: r.jobId } }
}

/** Save and send by text and email (PRD 6). A new version supersedes the one the client has. */
export async function sendQuote(input: QuoteDraftInput): Promise<R<{ quoteId: string; jobId: string }>> {
  const ctx = await tradeContext()
  if (!ctx) return { ok: false, error: 'Please sign in as a trade.' }
  const { admin, userId } = ctx

  const problems = quoteProblems(input)
  if (problems.length) return { ok: false, error: problems[0] }
  const mobile = normaliseUkMobile(input.client.mobile)
  if (!mobile) return { ok: false, error: 'Enter a UK mobile number for the client.' }
  if (!(await hasActivePlan(userId, admin))) {
    return { ok: false, error: 'Your trial has ended. Add a card from Plan and billing to send new quotes.' }
  }
  if (!(await hasBankDetails(admin, userId))) {
    return { ok: false, error: 'Add your bank details in Getting paid first, so the client knows where to pay.' }
  }

  const saved = await persistDraft(admin, userId, { ...input, client: { ...input.client, mobile } }, ctx.trade)
  if (!saved.ok) return saved

  const client = await ensureClientAccount(admin, {
    name: input.client.name, email: input.client.email, mobile, kind: input.client.kind, companyName: input.client.companyName,
  })
  if (!client.ok) return client
  if (client.userId === userId) return { ok: false, error: 'You can’t send a quote to yourself.' }

  const bundle = await loadQuote(admin, saved.quoteId)
  if (!bundle) return { ok: false, error: 'Quote not found.' }
  const updated = bundle.quote.version > 1
  const now = new Date().toISOString()

  await admin.from('quotes').update({ status: 'superseded' }).eq('job_id', saved.jobId).neq('id', saved.quoteId).in('status', ['sent', 'viewed', 'changes_requested'])
  await admin.from('quotes').update({ status: 'sent', sent_at: now, updated_at: now }).eq('id', saved.quoteId)
  await admin.from('quote_change_requests').update({ resolved_by_version: bundle.quote.version }).is('resolved_by_version', null)
    .in('quote_id', (await admin.from('quotes').select('id').eq('job_id', saved.jobId)).data?.map(q => q.id as string) ?? [])
  await admin.from('jobs').update({
    client_user_id: client.userId, client_profile_id: client.clientProfileId, current_quote_id: saved.quoteId, status: 'quoted',
  }).eq('id', saved.jobId)

  // The quoting trade sees the client's record next to the quote (PRD 14): logged for the audit trail
  await recordClientRecordView(admin, { tradeId: userId, clientId: client.userId, reason: 'quoting', jobId: saved.jobId })

  const sender = await getTradeSender(admin, userId)
  const link = await createAccessLink(admin, { clientUserId: client.userId, purpose: 'quote', targetPath: `/my/quotes/${saved.quoteId}`, createdBy: userId })
  await messageClient(admin, {
    tradeUserId: userId,
    clientUserId: client.userId,
    email: quoteSentEmail({ business: sender.businessName, title: bundle.quote.title, totalPence: bundle.quote.total_pence, link, updated, validUntil: fmtDate(bundle.quote.valid_until) }),
    sms: smsQuoteSent(sender.businessName, link, updated),
  })

  revalidatePath('/jobs')
  return { ok: true, data: { quoteId: saved.quoteId, jobId: saved.jobId } }
}

export async function withdrawQuote(quoteId: string): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const { data: q } = await s.admin.from('quotes').select('id, trade_user_id, status, job_id').eq('id', quoteId).maybeSingle()
  if (!q || q.trade_user_id !== s.userId) return { ok: false, error: 'Quote not found.' }
  if (!['sent', 'viewed', 'changes_requested', 'draft'].includes(q.status)) return { ok: false, error: 'This quote can’t be withdrawn now.' }
  await s.admin.from('quotes').update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() }).eq('id', quoteId)
  revalidatePath(`/jobs/${q.job_id}`)
  return { ok: true }
}

/** The trade gives the client another 7 days to pay the deposit (PRD 6). */
export async function extendDepositDeadline(quoteId: string): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const { data: q } = await s.admin.from('quotes').select('trade_user_id, job_id, deposit_due_by, status').eq('id', quoteId).maybeSingle()
  if (!q || q.trade_user_id !== s.userId) return { ok: false, error: 'Quote not found.' }
  const base = Math.max(Date.now(), q.deposit_due_by ? new Date(q.deposit_due_by).getTime() : Date.now())
  const next = new Date(base + 7 * 86_400_000).toISOString()
  await s.admin.from('quotes').update({ deposit_due_by: next, ...(q.status === 'expired' ? { status: 'accepted', expired_at: null } : {}) }).eq('id', quoteId)
  // Let the deposit reminders run again for the new deadline
  await s.admin.from('quote_follow_ups').delete().eq('quote_id', quoteId).like('kind', 'deposit_%')
  revalidatePath(`/jobs/${q.job_id}`)
  return { ok: true }
}

export async function saveSavedItem(input: { id?: string; description: string; pricePence: number }): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  const description = input.description.trim().slice(0, 200)
  if (!description) return { ok: false, error: 'Add a description.' }
  if (!Number.isFinite(input.pricePence) || input.pricePence < 0) return { ok: false, error: 'Enter a price.' }
  const row = { trade_id: s.userId, description, price_pence: Math.round(input.pricePence) }
  const q = input.id ? s.admin.from('saved_items').update(row).eq('id', input.id).eq('trade_id', s.userId) : s.admin.from('saved_items').insert(row)
  const { error } = await q
  if (error) return { ok: false, error: 'We could not save that item.' }
  revalidatePath('/profile/saved-items')
  return { ok: true }
}

export async function deleteSavedItem(id: string): Promise<R> {
  const s = await getTradeSession()
  if (!s) return { ok: false, error: 'Please sign in as a trade.' }
  await s.admin.from('saved_items').delete().eq('id', id).eq('trade_id', s.userId)
  revalidatePath('/profile/saved-items')
  return { ok: true }
}

/** Photo from the camera or gallery, for quotes, stages and variations. Returns the stored path. */
export async function uploadSitePhoto(formData: FormData): Promise<R<{ path: string }>> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const file = formData.get('file')
  const folder = String(formData.get('folder') ?? 'site').replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'site'
  if (!(file instanceof File)) return { ok: false, error: 'No photo received.' }
  const r = await storeJobPhoto(s.admin, s.userId, file, folder)
  if (!r.ok) return r
  return { ok: true, data: { path: r.path } }
}

// ── Client ────────────────────────────────────────────────────

async function clientQuote(quoteId: string) {
  const s = await getUserSession()
  if (!s) return null
  const b = await loadQuote(s.admin, quoteId)
  if (!b) return null
  const { data: job } = await s.admin.from('jobs').select('id, client_user_id, trade_user_id, title').eq('id', b.quote.job_id).maybeSingle()
  if (!job || job.client_user_id !== s.userId) return null
  return { ...s, bundle: b, job }
}

/**
 * Accept, from the client's own signed in session only (key rule 3). Records who, when, the client type
 * at that moment, the exact terms and deposit wording, and any early start consent.
 */
export async function acceptQuote(input: { quoteId: string; termsAgreed: boolean; cancellationRead: boolean; earlyStartConsent: boolean }): Promise<R<{ jobId: string; depositDue: boolean }>> {
  const c = await clientQuote(input.quoteId)
  if (!c) return { ok: false, error: 'Please sign in to accept this quote.' }
  const { admin, userId, bundle, job } = c
  const q = bundle.quote
  if (!['sent', 'viewed'].includes(q.status)) return { ok: false, error: 'This quote can’t be accepted now. It may have been updated or withdrawn.' }
  if (new Date(`${q.valid_until}T23:59:59Z`) < new Date()) return { ok: false, error: 'This quote has expired. Ask the trade for a new one.' }

  const { data: cp } = await admin.from('client_profiles').select('client_type').eq('user_id', userId).maybeSingle()
  // The client's own confirmed type is saved on the quote at acceptance (PRD 5)
  const kind = cp?.client_type === 'business' ? 'company' : 'person'
  if (!input.termsAgreed) return { ok: false, error: 'Please confirm you have read the terms.' }
  if (kind === 'person' && !input.cancellationRead) return { ok: false, error: 'Please confirm you have read the cancellation notice.' }
  const consentNeeded = needsEarlyStartConsentAtAcceptance(kind, q.planned_start_type, q.planned_start_date)
  if (q.deposit_non_refundable_from === 'payment' && kind !== 'company') {
    return { ok: false, error: 'This quote needs updating before you can accept it. Please ask the trade to send it again.' }
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const depWording = q.deposit_required
    ? depositWording({ amountPence: q.deposit_amount_pence, for: q.deposit_for, refundable: q.deposit_refundable, nonRefundableFrom: q.deposit_non_refundable_from, clientKind: kind })
    : null
  const snapshot = buildTermsSnapshot({ extraTerms: q.extra_terms, clientKind: kind, depositWording: depWording, earlyStartAsked: consentNeeded })
  const consentAt = consentNeeded && input.earlyStartConsent ? nowIso : null

  const { error } = await admin.from('quotes').update({
    status: 'accepted',
    accepted_at: nowIso,
    accepted_by_user_id: userId,
    client_type_at_acceptance: kind,
    early_start_consent_at: consentAt,
    terms_snapshot: snapshot,
    deposit_due_by: q.deposit_required ? new Date(now.getTime() + 7 * 86_400_000).toISOString() : null,
    updated_at: nowIso,
  }).eq('id', q.id).in('status', ['sent', 'viewed'])
  if (error) return { ok: false, error: 'We could not record that. Please try again.' }

  await admin.from('jobs').update({
    status: q.deposit_required ? 'quoted' : 'booked',
    booked_at: q.deposit_required ? null : nowIso,
    client_type_at_acceptance: kind,
    total_pence: q.total_pence,
    current_quote_id: q.id,
    agreed_start_date: q.planned_start_type === 'date' ? q.planned_start_date : null,
    cancellation_period_ends_at: kind === 'person' ? new Date(now.getTime() + 14 * 86_400_000).toISOString() : null,
    early_start_consent_at: consentAt,
    early_start_consent_by_user_id: consentAt ? userId : null,
  }).eq('id', job.id)

  const depositStageId = await createStagesFromQuote(admin, bundle, nowIso, userId)
  if (depositStageId) await onStageDue(admin, depositStageId)

  const sender = await getTradeSender(admin, q.trade_user_id)
  const { data: cu } = await admin.from('users').select('full_name').eq('id', userId).maybeSingle()
  const clientName = (cu?.full_name as string | undefined) ?? q.client_name
  await messageTrade(admin, {
    tradeUserId: q.trade_user_id, type: 'quote', title: `Quote accepted: ${q.title}`,
    body: `${clientName} accepted your quote${q.deposit_required ? '. The deposit is now due.' : '. The job is booked.'}`,
    link: `/jobs/${job.id}`,
    email: tradeQuoteEventEmail({ title: q.title, client: clientName, event: 'accepted', jobId: job.id }),
  })
  if (q.deposit_required) {
    const link = await createAccessLink(admin, { clientUserId: userId, purpose: 'invoice', targetPath: `/my/jobs/${job.id}`, createdBy: q.trade_user_id })
    await messageClient(admin, {
      tradeUserId: q.trade_user_id, clientUserId: userId,
      email: depositDueEmail({ business: sender.businessName, title: q.title, depositPence: q.deposit_amount_pence, link, day: 0, expiresOn: fmtDate(new Date(now.getTime() + 7 * 86_400_000).toISOString()) }),
      sms: smsDepositDue(sender.businessName, link),
    })
  }
  revalidatePath(`/my/quotes/${q.id}`)
  return { ok: true, data: { jobId: job.id, depositDue: q.deposit_required } }
}

export async function requestQuoteChanges(quoteId: string, note: string): Promise<R> {
  const c = await clientQuote(quoteId)
  if (!c) return { ok: false, error: 'Please sign in first.' }
  const text = note.trim().slice(0, 1000)
  if (text.length < 3) return { ok: false, error: 'Say briefly what you would like changed.' }
  const q = c.bundle.quote
  if (!['sent', 'viewed'].includes(q.status)) return { ok: false, error: 'This quote can’t be changed now.' }
  await c.admin.from('quote_change_requests').insert({ quote_id: quoteId, note: text, requested_by_user_id: c.userId })
  await c.admin.from('quotes').update({ status: 'changes_requested' }).eq('id', quoteId)
  await messageTrade(c.admin, {
    tradeUserId: q.trade_user_id, type: 'quote', title: `Changes asked for: ${q.title}`, body: text, link: `/jobs/${q.job_id}`,
    email: tradeQuoteEventEmail({ title: q.title, client: q.client_name, event: 'changes', jobId: q.job_id, note: text }),
  })
  return { ok: true }
}

export async function declineQuote(quoteId: string, reason: string): Promise<R> {
  const c = await clientQuote(quoteId)
  if (!c) return { ok: false, error: 'Please sign in first.' }
  const q = c.bundle.quote
  if (!['sent', 'viewed', 'changes_requested'].includes(q.status)) return { ok: false, error: 'This quote can’t be declined now.' }
  const text = reason.trim().slice(0, 500) || null
  await c.admin.from('quotes').update({ status: 'declined', declined_at: new Date().toISOString(), declined_reason: text }).eq('id', quoteId)
  await messageTrade(c.admin, {
    tradeUserId: q.trade_user_id, type: 'quote', title: `Quote declined: ${q.title}`, body: text ?? 'No reason given.', link: `/jobs/${q.job_id}`,
    email: tradeQuoteEventEmail({ title: q.title, client: q.client_name, event: 'declined', jobId: q.job_id, note: text }),
  })
  return { ok: true }
}
