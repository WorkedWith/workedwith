import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EvidenceForm } from './evidence-form'
import type { DisputeReason } from '@/types/database'

export const metadata = { title: 'Submit dispute evidence | WorkedWith' }

const REASON_LABELS: Record<DisputeReason, string> = {
  job_did_not_happen: 'Job did not happen',
  factually_incorrect: 'Factually incorrect',
  defamatory: 'Defamatory',
  wrong_person: 'Wrong person',
  other: 'Other',
}

export default async function EvidencePage({ params }: { params: { id: string } }) {
  const { id: reviewId } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData || !userData.phone_verified) redirect('/verify/phone')

  // Find the dispute for this review where caller is respondent
  const { data: dispute } = await admin
    .from('disputes')
    .select('*')
    .eq('review_id', reviewId)
    .eq('respondent_id', user.id)
    .maybeSingle()

  if (!dispute) redirect('/dashboard')

  const alreadySubmitted = !!dispute.respondent_submitted_at

  if (alreadySubmitted) {
    return (
      <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-2xl font-bold tracking-tight text-white">
              Worked<span className="text-brand-amber">With</span>
            </span>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-brand-navy">Evidence already submitted</h2>
            <p className="mt-2 text-sm text-gray-600">
              You have already submitted your evidence for this dispute. WorkedWith admin will review and reach a decision within 14 days.
            </p>
            <a
              href="/dashboard"
              className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </main>
    )
  }

  const reason = dispute.reason as DisputeReason
  const reasonLabel = REASON_LABELS[reason] ?? reason

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">Submit your evidence</h1>
          <p className="mt-2 text-sm text-white/60">
            A dispute has been raised on one of your reviews. Provide your evidence before the deadline.
          </p>
        </div>

        <EvidenceForm
          disputeId={dispute.id as string}
          disputeReason={reasonLabel}
          disputeDetails={dispute.details as string}
          evidenceDeadline={dispute.evidence_deadline as string}
        />
      </div>
    </main>
  )
}
