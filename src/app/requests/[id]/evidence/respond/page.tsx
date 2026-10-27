import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/components/app-header'
import { BackLink } from '@/components/back-link'
import { EVIDENCE_TYPE_LABEL, fmtDate, loadRequest } from '@/lib/evidence'
import { jobLabel } from '@/lib/trade-types'
import type { JobEvidenceClaim } from '@/types/database'
import { RespondForm } from './respond-form'

export const metadata = { title: 'Proof of a job | WorkedWith', robots: { index: false } }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <BackLink href="/dashboard" label="Back to dashboard" />
        {children}
      </div>
    </main>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-brand-navy">{title}</h1>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">{children}</div>
    </div>
  )
}

export default async function RespondToProofPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=/requests/${params.id}/evidence/respond`)

  const admin = createAdminClient()
  const req = await loadRequest(admin, params.id)
  if (!req || req.respondentId !== user.id) {
    return <Shell><Card title="Not found"><p>We could not find that request.</p></Card></Shell>
  }

  const { data: claims } = await admin
    .from('job_evidence_claims')
    .select('*')
    .eq('invite_kind', req.kind)
    .eq('invite_id', req.id)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
  const claim = ((claims ?? []) as unknown as JobEvidenceClaim[])[0]
  if (!claim) {
    return <Shell><Card title="No proof has been sent"><p>Nobody has sent proof for this request.</p></Card></Shell>
  }

  const { data: requester } = await admin.from('users').select('full_name').eq('id', claim.requester_id).maybeSingle()
  const requesterName = (requester?.full_name as string | undefined) ?? 'They'
  const label = jobLabel(req.jobType)
  const types = claim.evidence_types.map(t => EVIDENCE_TYPE_LABEL[t]).join(', ')

  if (claim.status === 'upheld') {
    return <Shell><Card title="The job is confirmed"><p>The {label} is confirmed and you can each leave a review.</p></Card></Shell>
  }
  if (claim.status === 'not_upheld') {
    return <Shell><Card title="The request stays declined"><p>We looked at both sides and decided the request stays declined.</p></Card></Shell>
  }
  if (claim.status === 'withdrawn') {
    return <Shell><Card title="Proof withdrawn"><p>{requesterName} has withdrawn their proof. There is nothing more to do.</p></Card></Shell>
  }

  return (
    <Shell>
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-brand-navy">{requesterName} has sent proof of a job</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          They say the {label} you declined did happen. They sent: {types || 'supporting evidence'}. You cannot see the files themselves, so no personal details are passed between you.
        </p>
        <blockquote className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 break-words">
          {claim.requester_statement}
        </blockquote>

        {claim.status === 'under_review' ? (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            You have given your side. We are looking at both and will decide by {fmtDate(claim.decision_deadline)}.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-gray-600">
              You have until <strong>{fmtDate(claim.response_deadline)}</strong> to give your side, or you can confirm the job now. We will then decide within 21 days.
            </p>
            <div className="mt-5">
              <RespondForm claimId={claim.id} />
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
