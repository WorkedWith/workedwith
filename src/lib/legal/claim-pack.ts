import type { createAdminClient } from '@/lib/supabase/admin'
import { PdfWriter } from '@/lib/pdf/writer'
import { renderInvoicePdf } from '@/lib/pdf/invoice-pdf'
import { loadInvoiceDoc } from '@/lib/invoices/document'
import { JOB_PHOTOS_BUCKET } from '@/lib/photos'
import { formatPenceExact } from '@/lib/money'
import { stageLabel, METHOD_LABEL } from '@/lib/payments/labels'
import type { ChaseEvent, Invoice, IssueNote, JobEvent, LegalDocument, Payment, PaymentStage, Quote, QuoteLine, StageEvidence, StageIssue, Variation } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')

/** The claim pack is available once the letter before action response period has passed (PRD 10). */
export async function claimPackAvailable(admin: AdminClient, jobId: string): Promise<LegalDocument | null> {
  const { data } = await admin.from('legal_documents').select('*').eq('job_id', jobId).eq('type', 'letter_before_action').not('sent_at', 'is', null).order('sent_at', { ascending: false }).limit(1).maybeSingle()
  const lba = data as LegalDocument | null
  if (!lba?.response_due_at || new Date(lba.response_due_at) > new Date()) return null
  return lba
}

async function photo(admin: AdminClient, pdf: PdfWriter, path: string, caption: string): Promise<void> {
  const kind = /\.png$/i.test(path) ? 'png' : /\.jpe?g$/i.test(path) ? 'jpg' : null
  if (!kind) {
    pdf.text(`${caption}: photo on file (${path.split('/').pop()})`, { size: 8, color: 'grey' })
    return
  }
  const { data } = await admin.storage.from(JOB_PHOTOS_BUCKET).download(path)
  if (!data) return
  await pdf.image(new Uint8Array(await data.arrayBuffer()), kind, caption)
}

/**
 * The job report for a small claim (PRD 10): everything that happened, from the record. The trade files the
 * claim themselves; WorkedWith does not file claims or act for anyone.
 */
export async function renderClaimPack(admin: AdminClient, jobId: string): Promise<Uint8Array | null> {
  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (!job) return null
  const [{ data: quotes }, { data: stages }, { data: vars }, { data: events }, { data: chases }, { data: invs }, { data: pays }, { data: lbas }] = await Promise.all([
    admin.from('quotes').select('*').eq('job_id', jobId).eq('status', 'accepted').limit(1),
    admin.from('payment_stages').select('*').eq('job_id', jobId).order('position'),
    admin.from('variations').select('*').eq('job_id', jobId).order('created_at'),
    admin.from('job_events').select('*').eq('job_id', jobId).order('created_at'),
    admin.from('chase_events').select('*').eq('job_id', jobId).order('sent_at'),
    admin.from('invoices').select('*').eq('job_id', jobId).order('sequence'),
    admin.from('payments').select('*').eq('job_id', jobId).order('paid_at'),
    admin.from('legal_documents').select('*').eq('job_id', jobId).eq('type', 'letter_before_action').order('generated_at'),
  ])
  const quote = (quotes?.[0] ?? null) as Quote | null
  const stageList = (stages ?? []) as PaymentStage[]
  const stageIds = stageList.map(s => s.id)
  const [{ data: lines }, { data: ev }, { data: iss }] = await Promise.all([
    quote ? admin.from('quote_lines').select('*').eq('quote_id', quote.id).order('position') : Promise.resolve({ data: [] }),
    stageIds.length ? admin.from('stage_evidence').select('*').in('stage_id', stageIds).order('created_at') : Promise.resolve({ data: [] }),
    stageIds.length ? admin.from('stage_issues').select('*').in('stage_id', stageIds).order('created_at') : Promise.resolve({ data: [] }),
  ])
  const issueIds = ((iss ?? []) as StageIssue[]).map(i => i.id)
  const { data: notes } = issueIds.length ? await admin.from('issue_notes').select('*').in('issue_id', issueIds).order('created_at') : { data: [] }

  const pdf = await PdfWriter.create()
  pdf.text('JOB REPORT AND CLAIM PACK', { size: 16, bold: true, color: 'navy' })
  pdf.text(`${job.title ?? 'Job'}${job.job_address ? `, ${job.job_address}` : ''}`)
  pdf.text(`Prepared from the WorkedWith record on ${dt(new Date().toISOString())}. WorkedWith does not file claims or act for either party.`, { size: 8, color: 'grey' })

  // Figures for Money Claim Online
  const outstanding = ((invs ?? []) as Invoice[]).filter(i => i.approval_basis !== 'deposit' && ['issued', 'part_paid'].includes(i.status))
  const principal = outstanding.reduce((s, i) => s + i.total_pence - i.amount_paid_pence, 0)
  const lba = ((lbas ?? []) as LegalDocument[]).filter(l => l.sent_at).pop()
  const lbaData = (lba?.data ?? {}) as { interestPence?: number; compensationPence?: number }
  pdf.space(8)
  pdf.text('1. Figures for Money Claim Online', { size: 12, bold: true })
  pdf.row('Amount claimed (unpaid invoices)', formatPenceExact(principal))
  if (lbaData.interestPence) pdf.row('Statutory interest claimed in the letter (company client)', formatPenceExact(lbaData.interestPence))
  if (lbaData.compensationPence) pdf.row('Fixed sum compensation (company client)', formatPenceExact(lbaData.compensationPence))
  pdf.row('Total before the court fee', formatPenceExact(principal + (lbaData.interestPence ?? 0) + (lbaData.compensationPence ?? 0)), { bold: true })
  pdf.text('Add the court fee for this amount from the current court fee table. Interest to the date of the claim may differ from the letter.', { size: 8, color: 'grey' })
  for (const i of outstanding) pdf.row(`Invoice ${i.invoice_number}, due ${dt(i.due_at)}`, formatPenceExact(i.total_pence - i.amount_paid_pence))

  pdf.space(8)
  pdf.text('2. Accepted quote, terms and acceptance record', { size: 12, bold: true })
  if (quote) {
    pdf.text(`${quote.title}, version ${quote.version}. Total ${formatPenceExact(quote.total_pence)}${quote.vat_applies ? ` including VAT of ${formatPenceExact(quote.vat_pence)}` : ''}.`)
    for (const l of (lines ?? []) as QuoteLine[]) pdf.row(l.description, formatPenceExact(l.price_pence))
    pdf.text(`Sent ${dt(quote.sent_at)}. Opened ${dt(quote.viewed_at)}. Accepted ${dt(quote.accepted_at)} by the client from their own signed in WorkedWith account (user ${quote.accepted_by_user_id}), as a ${quote.client_type_at_acceptance ?? 'person'} client.`)
    if (quote.terms_snapshot?.depositWording) pdf.text(`Deposit terms accepted: ${quote.terms_snapshot.depositWording}`)
    if (quote.early_start_consent_at) pdf.text(`Early start consent given at acceptance, ${dt(quote.early_start_consent_at)}: ${quote.terms_snapshot?.earlyStartConsentWording ?? ''}`)
    if (quote.terms_snapshot) {
      pdf.text(`Terms accepted (version ${quote.terms_snapshot.standardTermsVersion}):`, { bold: true })
      pdf.text(quote.terms_snapshot.standardTerms, { size: 8 })
      if (quote.terms_snapshot.extraTerms) pdf.text(`Extra terms: ${quote.terms_snapshot.extraTerms}`, { size: 8 })
      if (quote.terms_snapshot.cancellationNotice) pdf.text(`Cancellation notice shown: ${quote.terms_snapshot.cancellationNotice}`, { size: 8 })
    }
  }

  pdf.space(8)
  pdf.text('3. Job events: materials, start date and consent', { size: 12, bold: true })
  for (const e of ((events ?? []) as JobEvent[]).filter(x => ['materials_ordered', 'start_confirmed', 'started', 'consent_given', 'consent_requested', 'booked', 'cancelled'].includes(x.kind))) {
    pdf.text(`${dt(e.created_at)}: ${e.summary}`)
  }
  if (job.materials_order_evidence_path) await photo(admin, pdf, job.materials_order_evidence_path, 'Materials order')

  pdf.space(8)
  pdf.text('4. Approved variations', { size: 12, bold: true })
  const approvedVars = ((vars ?? []) as Variation[]).filter(v => v.status === 'approved')
  if (approvedVars.length === 0) pdf.text('None.')
  for (const v of approvedVars) pdf.text(`${dt(v.decided_at)}: ${v.description}, ${v.amount_pence > 0 ? 'adding' : 'taking off'} ${formatPenceExact(Math.abs(v.amount_pence))}. Approved by the client in their account.`)

  pdf.space(8)
  pdf.text('5. Stages, approvals, requests and issues', { size: 12, bold: true })
  for (const s of stageList) {
    pdf.text(`${s.name}: ${formatPenceExact(s.amount_pence)}. ${stageLabel(s)}.`, { bold: true })
    if (s.marked_done_at) pdf.text(`Marked done by the trade ${dt(s.marked_done_at)}.`)
    if (s.approved_at) pdf.text(`Approved by the client in their account ${dt(s.approved_at)}.`)
    if (s.requested_by_trade_at) pdf.text(`Payment requested by the trade. Not approved by the client. ${dt(s.requested_by_trade_at)}. Note: ${s.request_note ?? ''}`)
    for (const e of ((ev ?? []) as StageEvidence[]).filter(x => x.stage_id === s.id)) {
      if (e.note) pdf.text(`Trade note: ${e.note}`)
      for (const p of e.photo_paths.slice(0, 4)) await photo(admin, pdf, p, `${s.name}, ${dt(e.created_at)}`)
    }
    for (const i of ((iss ?? []) as StageIssue[]).filter(x => x.stage_id === s.id)) {
      pdf.text(`Issue raised by the client ${dt(i.created_at)}: ${i.reason}`)
      for (const n of ((notes ?? []) as IssueNote[]).filter(x => x.issue_id === i.id)) pdf.text(`${dt(n.created_at)} ${n.author_user_id === job.trade_user_id ? 'Trade' : 'Client'}: ${n.note}`, { indent: 10 })
    }
  }

  pdf.space(8)
  pdf.text('6. Payments', { size: 12, bold: true })
  const pl = (pays ?? []) as Payment[]
  if (pl.length === 0) pdf.text('None.')
  for (const p of pl) pdf.text(`${dt(p.paid_at)}: ${formatPenceExact(p.amount_pence)} by ${METHOD_LABEL[p.method]}${p.refunded_pence ? `, ${formatPenceExact(p.refunded_pence)} refunded` : ''}.`)

  pdf.space(8)
  pdf.text('7. Reminders sent', { size: 12, bold: true })
  for (const c of (chases ?? []) as ChaseEvent[]) pdf.text(`${dt(c.sent_at)}: ${c.step.replace('_', ' ')} (${c.channel.replace(/_/g, ' ')})`)
  for (const e of ((events ?? []) as JobEvent[]).filter(x => ['approval_reminder', 'chase'].includes(x.kind))) pdf.text(`${dt(e.created_at)}: ${e.summary}`)
  if (lba?.sent_at) pdf.text(`${dt(lba.sent_at)}: letter before action sent. Response due by ${dt(lba.response_due_at)}.`)

  const parts: Uint8Array[] = [await pdf.bytes()]
  for (const i of (invs ?? []) as Invoice[]) {
    const doc = await loadInvoiceDoc(admin, i.id)
    if (doc) parts.push(await (await renderInvoicePdf(doc)).bytes())
  }
  return PdfWriter.merge(parts)
}
