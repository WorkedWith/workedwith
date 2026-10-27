import { createAdminClient } from '@/lib/supabase/admin'
import { EVIDENCE_TYPE_LABEL, fmtDate } from '@/lib/evidence'
import { jobLabel } from '@/lib/trade-types'
import type { JobEvidenceClaim, JobEvidenceFile } from '@/types/database'
import { EvidenceDecision } from './evidence-decision'

export const metadata = { title: 'Evidence claims — WorkedWith Admin' }

export default async function EvidenceClaimsPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('job_evidence_claims')
    .select('*')
    .in('status', ['awaiting_response', 'under_review'])
    .order('decision_deadline', { ascending: true })
  const claims = (data ?? []) as unknown as JobEvidenceClaim[]

  const ids = claims.map(c => c.id)
  const userIds = Array.from(new Set(claims.flatMap(c => [c.requester_id, c.respondent_id])))
  const [{ data: rawFiles }, { data: rawUsers }, { data: rawPi }, { data: rawJi }] = await Promise.all([
    ids.length ? admin.from('job_evidence_files').select('*').in('claim_id', ids) : Promise.resolve({ data: [] }),
    userIds.length ? admin.from('users').select('id, full_name, email').in('id', userIds) : Promise.resolve({ data: [] }),
    claims.length ? admin.from('pending_invites').select('id, job_type, decline_reason, decline_note').in('id', claims.map(c => c.invite_id)) : Promise.resolve({ data: [] }),
    claims.length ? admin.from('job_invites').select('id, job_id, decline_reason, decline_note').in('id', claims.map(c => c.invite_id)) : Promise.resolve({ data: [] }),
  ])
  const files = (rawFiles ?? []) as unknown as JobEvidenceFile[]
  const users = (rawUsers ?? []) as unknown as { id: string; full_name: string; email: string | null }[]
  const reqs = [...((rawPi ?? []) as unknown as Record<string, unknown>[]), ...((rawJi ?? []) as unknown as Record<string, unknown>[])]
  const name = (id: string) => users.find(u => u.id === id)

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Evidence claims</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        {claims.length} open. Decide within 21 days. Files are deleted 30 days after a decision.
      </p>
      {claims.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Nothing waiting.</p>}
      <div className="space-y-4">
        {claims.map(c => {
          const r = reqs.find(x => x.id === c.invite_id)
          const rq = name(c.requester_id)
          const rs = name(c.respondent_id)
          const cf = files.filter(f => f.claim_id === c.id)
          return (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">
                {rq?.full_name ?? 'Unknown'} says a {typeof r?.job_type === 'string' ? jobLabel(r.job_type) : 'job'} happened
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Declined by {rs?.full_name ?? 'Unknown'}{r?.decline_reason ? ` (${String(r.decline_reason).replace(/_/g, ' ')})` : ''}
                {' · '}status {c.status.replace(/_/g, ' ')} · decide by {fmtDate(c.decision_deadline)}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Their statement</p>
              <p className="mt-1 break-words rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{c.requester_statement}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Other side</p>
              <p className="mt-1 break-words rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {c.respondent_statement ?? (typeof r?.decline_note === 'string' && r.decline_note ? `Decline note: ${r.decline_note}` : 'No reply yet.')}
              </p>
              <EvidenceDecision
                claimId={c.id}
                files={cf.map(f => ({ id: f.id, label: `${EVIDENCE_TYPE_LABEL[f.evidence_type]} (${f.file_type})`, by: f.uploaded_by === c.requester_id ? 'Requester' : 'Respondent' }))}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
