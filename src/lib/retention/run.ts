import type { createAdminClient } from '@/lib/supabase/admin'
import { JOB_PHOTOS_BUCKET } from '@/lib/photos'

type AdminClient = ReturnType<typeof createAdminClient>

const SIX_YEARS_MS = 6 * 365.25 * 86_400_000

/**
 * Daily record retention (PRD 11). Records are kept 6 years after the job is paid or cancelled, then
 * anonymised: amounts, numbers and dates stay (so the trade's totals still add up), but names, contact
 * details, addresses, notes and photos go.
 */
export async function runRetention(admin: AdminClient): Promise<{ scheduled: number; anonymised: number }> {
  const out = { scheduled: 0, anonymised: 0 }

  // 1. Set the retention date on jobs that have just finished
  const { data: done } = await admin.from('jobs').select('id, status, cancelled_at, updated_at').eq('flow', 'quote').in('status', ['paid', 'cancelled']).is('retain_until', null).limit(1000)
  for (const j of done ?? []) {
    const { data: last } = await admin.from('payments').select('paid_at').eq('job_id', j.id as string).order('paid_at', { ascending: false }).limit(1).maybeSingle()
    const base = (j.cancelled_at as string | null) ?? (last?.paid_at as string | null) ?? (j.updated_at as string)
    await admin.from('jobs').update({ retain_until: new Date(new Date(base).getTime() + SIX_YEARS_MS).toISOString() }).eq('id', j.id as string)
    out.scheduled++
  }

  // 2. Anonymise jobs past their retention date
  const { data: due } = await admin.from('jobs').select('id, materials_order_evidence_path').eq('flow', 'quote').lt('retain_until', new Date().toISOString()).is('anonymised_at', null).limit(200)
  for (const j of due ?? []) {
    const id = j.id as string
    const [{ data: quotes }, { data: stages }, { data: vars }] = await Promise.all([
      admin.from('quotes').select('id, photo_paths').eq('job_id', id),
      admin.from('payment_stages').select('id').eq('job_id', id),
      admin.from('variations').select('id, photo_paths').eq('job_id', id),
    ])
    const stageIds = (stages ?? []).map(s => s.id as string)
    const { data: ev } = stageIds.length ? await admin.from('stage_evidence').select('photo_paths').in('stage_id', stageIds) : { data: [] }
    const { data: iss } = stageIds.length ? await admin.from('stage_issues').select('id, photo_paths').in('stage_id', stageIds) : { data: [] }
    const paths = [
      ...(quotes ?? []).flatMap(q => (q.photo_paths as string[]) ?? []),
      ...(vars ?? []).flatMap(v => (v.photo_paths as string[]) ?? []),
      ...(ev ?? []).flatMap(e => (e.photo_paths as string[]) ?? []),
      ...(iss ?? []).flatMap(i => (i.photo_paths as string[]) ?? []),
      ...(j.materials_order_evidence_path ? [j.materials_order_evidence_path as string] : []),
    ]
    if (paths.length) await admin.storage.from(JOB_PHOTOS_BUCKET).remove(paths)

    await admin.from('quotes').update({ client_name: 'Removed', client_company_name: null, client_mobile: 'removed', client_email: 'removed', job_address: null, description: null, photo_paths: [], extra_terms: null }).eq('job_id', id)
    await admin.from('quote_change_requests').update({ note: 'Removed' }).in('quote_id', (quotes ?? []).map(q => q.id as string))
    if (stageIds.length) {
      await admin.from('stage_evidence').update({ photo_paths: [], note: null }).in('stage_id', stageIds)
      await admin.from('stage_issues').update({ reason: 'Removed', photo_paths: [] }).in('stage_id', stageIds)
      const issueIds = (iss ?? []).map(i => i.id as string)
      if (issueIds.length) await admin.from('issue_notes').update({ note: 'Removed', photo_paths: [] }).in('issue_id', issueIds)
      await admin.from('payment_stages').update({ request_note: null }).in('id', stageIds)
    }
    await admin.from('variations').update({ note: null, decline_note: null, photo_paths: [] }).eq('job_id', id)
    await admin.from('legal_documents').delete().eq('job_id', id)
    await admin.from('job_events').update({ data: null }).eq('job_id', id)
    const { data: invs } = await admin.from('invoices').select('id').eq('job_id', id)
    const invIds = (invs ?? []).map(i => i.id as string)
    if (invIds.length) {
      await admin.from('invoices').update({ payee_snapshot_encrypted: null }).in('id', invIds)
      await admin.from('bank_matches').update({ payer_name: null, reference: null }).in('invoice_id', invIds)
    }
    await admin.from('jobs').update({ job_address: null, description: null, cancellation_reason: null, materials_order_evidence_path: null, anonymised_at: new Date().toISOString() }).eq('id', id)
    out.anonymised++
  }

  // 3. Bank data: suggestions the trade never answered are forgotten after 90 days (key rule 10)
  await admin.from('bank_matches').update({ match_status: 'rejected_by_trade', payer_name: null, reference: null, decided_at: new Date().toISOString() })
    .eq('match_status', 'suggested').lt('received_at', new Date(Date.now() - 90 * 86_400_000).toISOString())

  return out
}
