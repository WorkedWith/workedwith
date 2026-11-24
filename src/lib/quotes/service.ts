import type { createAdminClient } from '@/lib/supabase/admin'
import { depositPence, plannedStages, quoteTotals, type QuoteDraftInput } from './calc'
import type { Quote, QuoteLine, QuoteStage } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type QuoteBundle = { quote: Quote; lines: QuoteLine[]; stages: QuoteStage[] }

export async function loadQuote(admin: AdminClient, quoteId: string): Promise<QuoteBundle | null> {
  const { data: quote } = await admin.from('quotes').select('*').eq('id', quoteId).maybeSingle()
  if (!quote) return null
  const [{ data: lines }, { data: stages }] = await Promise.all([
    admin.from('quote_lines').select('*').eq('quote_id', quoteId).order('position'),
    admin.from('quote_stages').select('*').eq('quote_id', quoteId).order('position'),
  ])
  return { quote: quote as Quote, lines: (lines ?? []) as QuoteLine[], stages: (stages ?? []) as QuoteStage[] }
}

/** A loaded quote back into builder input (editing, or copying a previous quote). */
export function bundleToInput(b: QuoteBundle, opts?: { copy?: boolean }): QuoteDraftInput {
  const q = b.quote
  return {
    quoteId: opts?.copy ? null : q.id,
    jobId: opts?.copy ? null : q.job_id,
    client: opts?.copy
      ? { kind: 'person', name: '', companyName: '', mobile: '', email: '', jobAddress: '' }
      : { kind: q.client_type, name: q.client_name, companyName: q.client_company_name ?? '', mobile: q.client_mobile, email: q.client_email, jobAddress: q.job_address ?? '' },
    title: q.title,
    description: q.description ?? '',
    lines: b.lines.map(l => ({ description: l.description, pricePence: l.price_pence })),
    vatApplies: q.vat_applies,
    validDays: 30,
    plannedStart: opts?.copy ? { type: 'to_be_agreed', date: null } : { type: q.planned_start_type, date: q.planned_start_date },
    deposit: {
      required: q.deposit_required,
      mode: q.deposit_mode ?? 'amount',
      percent: Number(q.deposit_percent ?? 0),
      amountPence: q.deposit_amount_pence,
      for: q.deposit_for ?? 'materials',
      refundable: q.deposit_refundable,
      nonRefundableFrom: q.deposit_non_refundable_from === 'payment' && opts?.copy ? 'materials_ordered' : q.deposit_non_refundable_from,
    },
    timing: q.payment_timing,
    stages: b.stages.map(s => ({ name: s.name, amountPence: s.amount_pence })),
    extraTerms: q.extra_terms ?? '',
    followUps: q.follow_ups_enabled,
    photoPaths: opts?.copy ? [] : q.photo_paths,
  }
}

function addDays(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

/**
 * Save the builder's state as a draft. A draft is updated in place. Editing a quote that was already
 * sent makes a new draft version on the same job; the sent one stays until the new one is sent (PRD 6).
 */
export async function persistDraft(
  admin: AdminClient,
  tradeUserId: string,
  input: QuoteDraftInput,
  trade: { vatRegistered: boolean; tradeProfileId: string; jobType: string },
): Promise<{ ok: true; quoteId: string; jobId: string } | { ok: false; error: string }> {
  const lines = input.lines.filter(l => l.description.trim() || l.pricePence > 0)
  const vatApplies = trade.vatRegistered && input.vatApplies
  const totals = quoteTotals(lines, vatApplies)
  const dep = depositPence(input.deposit, totals.totalPence)
  const stages = input.timing === 'in_stages' ? plannedStages(input, totals.totalPence, dep) : []
  const validDays = Math.min(90, Math.max(1, Math.round(input.validDays || 30)))

  let jobId = input.jobId ?? null
  let quoteId = input.quoteId ?? null

  if (quoteId) {
    const { data: existing } = await admin.from('quotes').select('id, job_id, status, trade_user_id').eq('id', quoteId).maybeSingle()
    if (!existing || existing.trade_user_id !== tradeUserId) return { ok: false, error: 'Quote not found.' }
    jobId = existing.job_id
    if (existing.status === 'accepted') return { ok: false, error: 'This quote has been accepted. Add a variation instead.' }
    if (existing.status !== 'draft') quoteId = null // a new version
  }

  if (jobId) {
    const { data: job } = await admin.from('jobs').select('id, trade_user_id, status').eq('id', jobId).maybeSingle()
    if (!job || job.trade_user_id !== tradeUserId) return { ok: false, error: 'Job not found.' }
    if (job.status !== 'quoted') return { ok: false, error: 'This job has started. Changes go through a variation.' }
    const { data: accepted } = await admin.from('quotes').select('id').eq('job_id', jobId).eq('status', 'accepted').maybeSingle()
    if (accepted) return { ok: false, error: 'This quote has been accepted. Add a variation instead.' }
  } else {
    const { data: job, error } = await admin
      .from('jobs')
      .insert({
        flow: 'quote',
        status: 'quoted',
        job_type: trade.jobType,
        trade_profile_id: trade.tradeProfileId,
        trade_user_id: tradeUserId,
        initiated_by: 'trade',
        title: input.title.trim() || 'New job',
        description: input.description.trim() || null,
        job_address: input.client.jobAddress.trim() || null,
        is_backdated: false,
      })
      .select('id')
      .single()
    if (error || !job) return { ok: false, error: 'We could not save the quote. Please try again.' }
    jobId = job.id as string
  }

  const row = {
    job_id: jobId,
    trade_user_id: tradeUserId,
    status: 'draft' as const,
    client_type: input.client.kind,
    client_name: input.client.name.trim(),
    client_company_name: input.client.kind === 'company' ? input.client.companyName.trim() || null : null,
    client_mobile: input.client.mobile.trim(),
    client_email: input.client.email.trim().toLowerCase(),
    job_address: input.client.jobAddress.trim() || null,
    title: input.title.trim() || 'New job',
    description: input.description.trim() || null,
    photo_paths: input.photoPaths.slice(0, 10),
    valid_until: addDays(validDays),
    deposit_required: input.deposit.required,
    deposit_mode: input.deposit.required ? input.deposit.mode : null,
    deposit_percent: input.deposit.required && input.deposit.mode === 'percent' ? input.deposit.percent : null,
    deposit_amount_pence: dep,
    deposit_for: input.deposit.required ? input.deposit.for : null,
    deposit_refundable: input.deposit.required ? input.deposit.refundable : true,
    deposit_non_refundable_from: input.deposit.required && !input.deposit.refundable ? input.deposit.nonRefundableFrom : null,
    payment_timing: input.timing,
    planned_start_type: input.plannedStart.type,
    planned_start_date: input.plannedStart.type === 'date' ? input.plannedStart.date : null,
    vat_registered: trade.vatRegistered,
    vat_applies: vatApplies,
    net_pence: totals.netPence,
    vat_pence: totals.vatPence,
    total_pence: totals.totalPence,
    extra_terms: input.extraTerms.trim() || null,
    follow_ups_enabled: input.followUps,
    updated_at: new Date().toISOString(),
  }

  if (quoteId) {
    const { error } = await admin.from('quotes').update(row).eq('id', quoteId)
    if (error) return { ok: false, error: 'We could not save the quote. Please try again.' }
  } else {
    const { data: last } = await admin.from('quotes').select('version').eq('job_id', jobId).order('version', { ascending: false }).limit(1).maybeSingle()
    const version = (last?.version ?? 0) + 1
    const { data: q, error } = await admin.from('quotes').insert({ ...row, version }).select('id').single()
    if (error || !q) {
      console.error('Quote insert failed:', error)
      return { ok: false, error: 'We could not save the quote. Please check the details and try again.' }
    }
    quoteId = q.id as string
  }

  await admin.from('quote_lines').delete().eq('quote_id', quoteId)
  if (lines.length) {
    await admin.from('quote_lines').insert(lines.map((l, i) => ({ quote_id: quoteId as string, position: i, description: l.description.trim(), price_pence: Math.round(l.pricePence) })))
  }
  await admin.from('quote_stages').delete().eq('quote_id', quoteId)
  if (stages.length) {
    await admin.from('quote_stages').insert(stages.map((s, i) => ({ quote_id: quoteId as string, position: i, name: s.name, amount_pence: s.amountPence })))
  }
  await admin.from('jobs').update({ title: row.title, description: row.description, job_address: row.job_address }).eq('id', jobId)
  return { ok: true, quoteId, jobId }
}

/** On acceptance: the payment stages the client will pay (PRD 9). The deposit is due straight away. */
export async function createStagesFromQuote(admin: AdminClient, b: QuoteBundle, acceptedAt: string, clientUserId: string): Promise<string | null> {
  const q = b.quote
  await admin.from('payment_stages').delete().eq('job_id', q.job_id)
  const rows = [] as {
    job_id: string; quote_id: string; position: number; name: string; amount_pence: number; is_deposit: boolean
    status: 'upcoming' | 'approved'; approved_at?: string; approved_by_user_id?: string; due_at?: string
  }[]
  if (q.deposit_required && q.deposit_amount_pence > 0) {
    rows.push({
      job_id: q.job_id, quote_id: q.id, position: 0, name: 'Deposit', amount_pence: q.deposit_amount_pence, is_deposit: true,
      // Accepting the quote is the approval of the deposit
      status: 'approved', approved_at: acceptedAt, approved_by_user_id: clientUserId, due_at: acceptedAt,
    })
  }
  const later = q.payment_timing === 'on_completion'
    ? [{ name: 'Balance on completion', amount_pence: q.total_pence - q.deposit_amount_pence }]
    : b.stages.map(s => ({ name: s.name, amount_pence: s.amount_pence }))
  later.filter(s => s.amount_pence > 0).forEach((s, i) => rows.push({
    job_id: q.job_id, quote_id: q.id, position: i + 1, name: s.name, amount_pence: s.amount_pence, is_deposit: false, status: 'upcoming',
  }))
  const { data } = await admin.from('payment_stages').insert(rows).select('id, is_deposit')
  return (data ?? []).find(r => r.is_deposit)?.id ?? null
}
