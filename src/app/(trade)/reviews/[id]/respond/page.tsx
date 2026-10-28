import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RespondForm } from './respond-form'

export const metadata = { title: 'Respond to a review | WorkedWith' }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  )
}

export default async function RespondPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('phone_verified').eq('id', user.id).maybeSingle()
  if (!me?.phone_verified) redirect('/verify/phone')

  const { data: review } = await admin.from('reviews').select('*').eq('id', params.id).maybeSingle()
  if (!review || (review.reviewee_id as string) !== user.id) redirect('/dashboard')

  const jobId = review.job_id as string
  let message: string | null = null
  if (!(review.is_visible as boolean)) message = 'This review is not published yet.'
  else if (review.response_text) message = 'You have already responded to this review. Responses are permanent.'

  if (message) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <h2 className="text-lg font-semibold text-brand-navy">Response not available</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>
          <Link href={`/jobs/${jobId}`} className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90">
            Back to job
          </Link>
        </div>
      </Shell>
    )
  }

  let canDispute = (review.dispute_status as string) === 'none'
  if (canDispute) {
    const { data: w } = await admin.from('review_windows').select('both_submitted_at').eq('job_id', jobId).maybeSingle()
    const liveSince = (w?.both_submitted_at as string | null | undefined) ?? (review.submitted_at as string)
    canDispute = Date.now() - new Date(liveSince).getTime() <= 14 * 86_400_000
  }

  return (
    <Shell>
      <div className="mb-3 rounded-xl bg-white/10 p-4 text-sm text-white">
        <p className="font-semibold">The review</p>
        <p className="mt-1 text-white/80">{(review.written_review as string | null) || 'Ratings only, no written review.'}</p>
      </div>
      <RespondForm reviewId={params.id} jobId={jobId} canDispute={canDispute} />
    </Shell>
  )
}
