import { redirect } from 'next/navigation'
import { getReviewFormData } from '@/actions/get-review-form-data'
import { TradeReviewForm } from './trade-review-form'
import { ClientReviewForm } from './client-review-form'

export const metadata = { title: 'Leave a review | WorkedWith' }

function Shell({ jobId, children }: { jobId: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
        </div>
        {children}
        <div className="mt-4 text-center">
          <a href={`/jobs/${jobId}`} className="text-sm text-white/50 hover:text-white transition-colors">
            ← Back to job
          </a>
        </div>
      </div>
    </main>
  )
}

function InfoCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <svg className="h-6 w-6 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>
    </div>
  )
}

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const { id } = params
  const data = await getReviewFormData(id)

  if (data.status === 'auth_required') redirect('/')
  if (data.status === 'unverified') redirect('/verify/phone')
  if (data.status === 'not_participant') redirect('/dashboard')
  if (data.status === 'job_not_complete') redirect(`/jobs/${id}`)
  if (data.status === 'no_window') redirect(`/jobs/${id}`)

  if (data.status === 'window_closed') {
    return (
      <Shell jobId={id}>
        <InfoCard
          title="Review window closed"
          message="The 30-day review window for this job has passed. Reviews can no longer be submitted."
        />
      </Shell>
    )
  }

  if (data.status === 'already_submitted') {
    return (
      <Shell jobId={id}>
        <InfoCard
          title="Review submitted"
          message={`You've already submitted your review. We'll notify you when ${data.revieweeName} submits theirs, and both will go live together.`}
        />
      </Shell>
    )
  }

  // status === 'ok'
  return (
    <Shell jobId={id}>
      {data.reviewerType === 'trade' ? (
        <TradeReviewForm
          jobId={data.jobId}
          revieweeName={data.revieweeName}
          jobType={data.jobType}
        />
      ) : (
        <ClientReviewForm
          jobId={data.jobId}
          revieweeName={data.revieweeName}
          jobType={data.jobType}
        />
      )}
    </Shell>
  )
}
