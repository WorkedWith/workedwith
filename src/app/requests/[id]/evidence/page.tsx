import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/components/app-header'
import { BackLink } from '@/components/back-link'
import { EVIDENCE_WINDOW_DAYS, addDays, fmtDate, loadRequest } from '@/lib/evidence'
import { jobLabel } from '@/lib/trade-types'
import type { JobEvidenceClaim } from '@/types/database'
import { EvidenceClaimForm } from './evidence-claim-form'
import { WithdrawButton } from './withdraw-button'

export const metadata = { title: 'Send proof | WorkedWith', robots: { index: false } }

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

export default async function SendProofPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?next=/requests/${params.id}/evidence`)

  const admin = createAdminClient()
  const req = await loadRequest(admin, params.id)
  if (!req || req.requesterId !== user.id) {
    return <Shell><Card title="Request not found"><p>We could not find that job request.</p></Card></Shell>
  }

  const label = jobLabel(req.jobType)

  if (req.overturned) {
    return <Shell><Card title="This job is confirmed"><p>The {label} has been confirmed, so there is nothing more to send.</p></Card></Shell>
  }
  if (!req.declined || !req.respondentId || !req.declinedAt) {
    return <Shell><Card title="Nothing to prove yet"><p>This request has not been declined.</p></Card></Shell>
  }

  const { data: respondent } = await admin.from('users').select('full_name').eq('id', req.respondentId).maybeSingle()
  const respondentName = (respondent?.full_name as string | undefined) ?? 'They'

  // Latest claim for this request
  const { data: claims } = await admin
    .from('job_evidence_claims')
    .select('*')
    .eq('invite_kind', req.kind)
    .eq('invite_id', req.id)
    .order('created_at', { ascending: false })
  const all = (claims ?? []) as unknown as JobEvidenceClaim[]
  const sent = all.find(c => c.status !== 'draft')
  const draft = all.find(c => c.status === 'draft')

  if (sent) {
    const closed = sent.status === 'upheld' || sent.status === 'not_upheld' || sent.status === 'withdrawn'
    const heading =
      sent.status === 'upheld' ? 'The job is confirmed'
      : sent.status === 'not_upheld' ? 'The request stays declined'
      : sent.status === 'withdrawn' ? 'You withdrew your proof'
      : 'Your proof has been sent'
    return (
      <Shell>
        <Card title={heading}>
          {sent.status === 'awaiting_response' && (
            <p>{respondentName} has until {fmtDate(sent.response_deadline)} to give their side or confirm the job. We will then decide by {fmtDate(sent.decision_deadline)}.</p>
          )}
          {sent.status === 'under_review' && (
            <p>We are looking at both sides now and will decide by {fmtDate(sent.decision_deadline)}. We will email you.</p>
          )}
          {sent.status === 'upheld' && <p>The {label} is confirmed and you can each leave a review.</p>}
          {sent.status === 'not_upheld' && <p>We looked at both sides and the request stays declined.</p>}
          {closed ? null : <WithdrawButton claimId={sent.id} />}
        </Card>
      </Shell>
    )
  }

  const deadline = addDays(new Date(req.declinedAt), EVIDENCE_WINDOW_DAYS)
  if (deadline.getTime() < Date.now()) {
    return (
      <Shell>
        <Card title="The time to send proof has passed">
          <p>Proof can be sent within {EVIDENCE_WINDOW_DAYS} days of a decline. If the job did happen, you can log it again.</p>
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-brand-navy">Did this job happen? Send proof</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {respondentName} has not confirmed the {label} you logged. If it did happen, send something that shows it, such as an invoice or a bank transfer.
          We will look at it and decide. You have until {fmtDate(deadline.toISOString())}.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          What you send is kept private. {respondentName} sees the types of proof and what you write, but not the files themselves. We delete the files 30 days after we decide.
        </p>
        <div className="mt-5">
          <EvidenceClaimForm requestId={req.id} existingStatement={draft?.requester_statement ?? ''} />
        </div>
      </div>
    </Shell>
  )
}
