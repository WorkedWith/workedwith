import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { EVIDENCE_WINDOW_DAYS, fmtDate } from '@/lib/evidence'
import { jobLabel } from '@/lib/trade-types'

type Row = Record<string, unknown>

/** Dashboard boxes: declined requests you can send proof for, and proof waiting for your reply. */
export async function EvidencePrompts({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const since = new Date(Date.now() - EVIDENCE_WINDOW_DAYS * 86_400_000).toISOString()

  const [{ data: pi }, { data: ji }, { data: waiting }, { data: claims }] = await Promise.all([
    admin.from('pending_invites').select('id, job_type').eq('inviting_client_id', userId).eq('status', 'declined').is('overturned_at', null).gte('declined_at', since),
    admin.from('job_invites').select('id, job_id').eq('inviter_id', userId).eq('status', 'declined').is('overturned_at', null).gte('declined_at', since),
    admin.from('job_evidence_claims').select('id, invite_id, response_deadline').eq('respondent_id', userId).eq('status', 'awaiting_response'),
    admin.from('job_evidence_claims').select('invite_id').eq('requester_id', userId).neq('status', 'draft'),
  ])
  const used = new Set(((claims ?? []) as Row[]).map(c => c.invite_id as string))
  const declined = [...((pi ?? []) as Row[]), ...((ji ?? []) as Row[])].filter(r => !used.has(r.id as string))
  const jobIds = ((ji ?? []) as Row[]).map(r => r.job_id as string)
  const { data: jobs } = jobIds.length ? await admin.from('jobs').select('id, job_type').in('id', jobIds) : { data: [] }
  const typeOf = (r: Row) => (r.job_type as string | undefined) ?? (((jobs ?? []) as Row[]).find(j => j.id === r.job_id)?.job_type as string | undefined) ?? 'job'

  const waitingRows = (waiting ?? []) as Row[]
  if (declined.length === 0 && waitingRows.length === 0) return null

  return (
    <div className="mb-6 space-y-3">
      {waitingRows.map(w => (
        <div key={w.id as string} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-brand-navy">Someone has sent proof of a job you declined</p>
          <p className="mt-1 text-sm text-gray-600">Give your side or confirm it by {fmtDate(w.response_deadline as string)}.</p>
          <Link href={`/requests/${w.invite_id as string}/evidence/respond`} className="mt-2 inline-block text-sm font-semibold text-brand-navy underline">Take a look</Link>
        </div>
      ))}
      {declined.map(d => (
        <div key={d.id as string} className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-brand-navy">A {jobLabel(typeOf(d))} request was declined</p>
          <p className="mt-1 text-sm text-gray-600">If the job did happen, you can send proof and we will look at it.</p>
          <Link href={`/requests/${d.id as string}/evidence`} className="mt-2 inline-block text-sm font-semibold text-brand-navy underline">Send proof</Link>
        </div>
      ))}
    </div>
  )
}
