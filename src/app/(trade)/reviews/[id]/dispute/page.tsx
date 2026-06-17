import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DisputeForm } from './dispute-form'

export const metadata = { title: 'Raise a dispute | WorkedWith' }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
        </div>
        {children}
      </div>
    </main>
  )
}

function IneligibleCard({ message, jobId }: { message: string; jobId: string | null }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <svg className="h-6 w-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-brand-navy">Dispute not available</h2>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>
      <a
        href={jobId ? `/jobs/${jobId}` : '/dashboard'}
        className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
      >
        {jobId ? 'Back to job' : 'Back to dashboard'}
      </a>
    </div>
  )
}

export default async function DisputePage({ params }: { params: { id: string } }) {
  const { id: reviewId } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData || !userData.phone_verified) redirect('/verify/phone')

  // Fetch review
  const { data: review } = await admin
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .maybeSingle()

  if (!review) redirect('/dashboard')

  // Must be the reviewee
  if ((review.reviewee_id as string) !== user.id) redirect('/dashboard')

  const reviewJobId = review.job_id as string

  // Check eligibility
  let ineligibleMessage: string | null = null

  if (!(review.is_visible as boolean)) {
    ineligibleMessage = 'This review is not yet published. Disputes can only be raised on published reviews.'
  } else if ((review.dispute_status as string) !== 'none') {
    ineligibleMessage = 'A dispute has already been raised for this review. Each review can only have one dispute.'
  } else {
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
    if (Date.now() - new Date(review.submitted_at as string).getTime() > fourteenDaysMs) {
      ineligibleMessage = 'The 14-day dispute window for this review has closed. Disputes must be raised within 14 days of a review being published.'
    }
  }

  if (ineligibleMessage) {
    return (
      <Shell>
        <IneligibleCard message={ineligibleMessage} jobId={reviewJobId} />
      </Shell>
    )
  }

  return (
    <Shell>
      <DisputeForm reviewId={reviewId} reviewJobId={reviewJobId} />
    </Shell>
  )
}
