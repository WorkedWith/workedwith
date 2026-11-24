import type { createAdminClient } from '@/lib/supabase/admin'
import { signedPhotoUrls } from '@/lib/photos'
import type { Invoice, IssueNote, Payment, StageEvidence, StageIssue } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type StageDetails = {
  evidence: Map<string, StageEvidence[]>
  issues: Map<string, (StageIssue & { notes: IssueNote[] })[]>
  invoices: Map<string, Invoice>
  payments: Map<string, Payment[]>
  photoUrl: Map<string, string>
}

/** Everything both job pages show under the stages, with signed photo links. */
export async function loadStageDetails(admin: AdminClient, jobId: string, stageIds: string[]): Promise<StageDetails> {
  const out: StageDetails = { evidence: new Map(), issues: new Map(), invoices: new Map(), payments: new Map(), photoUrl: new Map() }
  if (stageIds.length === 0) return out
  const [{ data: ev }, { data: iss }, { data: inv }, { data: pay }] = await Promise.all([
    admin.from('stage_evidence').select('*').in('stage_id', stageIds).order('created_at'),
    admin.from('stage_issues').select('*').in('stage_id', stageIds).order('created_at'),
    admin.from('invoices').select('*').eq('job_id', jobId).neq('status', 'credited'),
    admin.from('payments').select('*').eq('job_id', jobId).order('paid_at'),
  ])
  const issueIds = (iss ?? []).map(i => i.id as string)
  const { data: notes } = issueIds.length ? await admin.from('issue_notes').select('*').in('issue_id', issueIds).order('created_at') : { data: [] }
  const paths: string[] = []
  for (const e of (ev ?? []) as StageEvidence[]) { out.evidence.set(e.stage_id, [...(out.evidence.get(e.stage_id) ?? []), e]); paths.push(...e.photo_paths) }
  for (const i of (iss ?? []) as StageIssue[]) {
    const n = ((notes ?? []) as IssueNote[]).filter(x => x.issue_id === i.id)
    out.issues.set(i.stage_id, [...(out.issues.get(i.stage_id) ?? []), { ...i, notes: n }])
    paths.push(...i.photo_paths, ...n.flatMap(x => x.photo_paths))
  }
  for (const i of (inv ?? []) as Invoice[]) if (i.stage_id) out.invoices.set(i.stage_id, i)
  for (const p of (pay ?? []) as Payment[]) out.payments.set(p.stage_id, [...(out.payments.get(p.stage_id) ?? []), p])
  for (const s of await signedPhotoUrls(admin, Array.from(new Set(paths)))) out.photoUrl.set(s.path, s.url)
  return out
}
