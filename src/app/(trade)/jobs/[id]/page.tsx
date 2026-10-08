import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { completeJob } from '@/actions/complete-job'
import { ReportClaimButton } from '@/components/report-claim-button'
import type { JobStatus } from '@/types/database'
import { BackLink } from '@/components/back-link'
import { InviteMessage } from '@/components/invite-message'
import { RemindClientButton } from '@/components/remind-client-button'
import { VerifyIdPrompt } from '@/components/verify-id-prompt'
import { workTitle } from '@/lib/trade-types'

export const metadata = { title: 'Job details | WorkedWith' }

// ── Helpers ───────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_LABELS: Record<JobStatus, string> = {
  pending_confirmation: 'Awaiting client confirmation',
  active:              'Active',
  completed:           'Completed',
  disputed:            'Disputed',
  cancelled:           'Cancelled',
}

const STATUS_COLOURS: Record<JobStatus, string> = {
  pending_confirmation: 'bg-amber-100 text-amber-700',
  active:              'bg-green-100 text-green-700',
  completed:           'bg-blue-100 text-blue-700',
  disputed:            'bg-red-100 text-red-700',
  cancelled:           'bg-gray-100 text-gray-500',
}

// ── Page ──────────────────────────────────────────────────────

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()

  const { data: job } = await admin.from('jobs').select('*').eq('id', id).single()
  if (!job || !job.trade_profile_id) redirect('/dashboard')

  // Verify this user owns the trade profile
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('id', job.trade_profile_id)
    .single()

  // Clients cannot open the trade's job page. Their reviews, and the dispute link, live on My profile.
  if (!tradeProfile || tradeProfile.user_id !== user.id) redirect('/profile')

  // Fetch invite, client profile, review window, and pending claim in parallel
  const [{ data: invite }, { data: reviewWindow }, { data: pendingInviteClaim }] = await Promise.all([
    admin.from('job_invites').select('*').eq('job_id', id).maybeSingle(),
    admin.from('review_windows').select('*').eq('job_id', id).maybeSingle(),
    admin.from('pending_invites').select('id, status').eq('resulting_job_id', id).maybeSingle(),
  ])

  // The client's published review of this trade, if there is one
  const { data: receivedRaw } = await admin
    .from('reviews')
    .select('id, overall_rating, written_review, dispute_status, submitted_at')
    .eq('job_id', id)
    .eq('reviewee_id', user.id)
    .eq('reviewee_type', 'trade')
    .eq('is_visible', true)
    .maybeSingle()
  const receivedReview = receivedRaw as unknown as {
    id: string; overall_rating: number | null; written_review: string | null; dispute_status: string; submitted_at: string
  } | null
  const liveSinceIso = (reviewWindow?.both_submitted_at as string | null | undefined) ?? receivedReview?.submitted_at ?? null
  const disputeClosesAt = liveSinceIso ? new Date(new Date(liveSinceIso).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() : null
  const disputeOpen = disputeClosesAt ? new Date(disputeClosesAt) > new Date() : false

  // Client details if confirmed
  let clientUser: { full_name: string; email: string } | null = null
  if (job.client_profile_id) {
    const { data: cp } = await admin
      .from('client_profiles')
      .select('*')
      .eq('id', job.client_profile_id)
      .single()
    if (cp?.user_id) {
      const { data: cu } = await admin
        .from('users')
        .select('*')
        .eq('id', cp.user_id)
        .single()
      if (cu) clientUser = { full_name: cu.full_name, email: cu.email }
    }
  }

  const status = job.status as JobStatus

  const { data: viewer } = await admin
    .from('users')
    .select('phone_verified, verification_tier, id_verification_status')
    .eq('id', user.id)
    .single()
  const showVerifyPrompt =
    (status === 'active' || status === 'completed') &&
    !!viewer &&
    viewer.verification_tier !== 'fully_verified' &&
    viewer.id_verification_status !== 'pending'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-5">
        <BackLink href="/dashboard" label="Back to dashboard" />
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">{workTitle(job.job_type)}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{job.postcode ?? '—'}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOURS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        {showVerifyPrompt && <VerifyIdPrompt phoneVerified={!!viewer?.phone_verified} />}

        {/* Details card */}
        <section className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <Row label="Job type" value={workTitle(job.job_type)} />
          <Row label="Location" value={job.postcode ?? '—'} />
          <Row label="Description" value={job.description ?? '—'} />
          <Row label="Approximate start" value={fmt(job.started_at)} />
          <Row label="Confirmed" value={fmt(job.confirmed_at)} />
          {job.completed_at && <Row label="Completed" value={fmt(job.completed_at)} />}
          {job.agreed_payment_terms_days !== null && (
            <Row
              label="Payment terms"
              value={job.agreed_payment_terms_days === 0 ? 'On completion' : `${job.agreed_payment_terms_days} days`}
            />
          )}
        </section>

        {/* Client card */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-brand-navy">Client</h2>
          </div>
          {clientUser ? (
            <div className="px-6 py-4 space-y-1">
              <p className="text-sm font-medium text-gray-900">{clientUser.full_name}</p>
              <p className="text-xs text-gray-500">{clientUser.email}</p>
            </div>
          ) : (
            <div className="px-6 py-4">
              <p className="text-sm text-gray-500">
                {invite
                  ? `Invite sent to ${invite.invitee_email ?? invite.invitee_phone ?? '—'} · ${invite.status === 'pending' ? `Expires ${fmt(invite.expires_at)}` : invite.status}`
                  : 'No invite sent'}
              </p>
            </div>
          )}
        </section>

        {/* Review window */}
        {reviewWindow && (
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-brand-navy">Review window</h2>
            </div>
            <div className="px-6 py-4 space-y-1">
              <p className="text-sm text-gray-700">
                {reviewWindow.trade_review_submitted ? '✓' : '○'} Your review{' '}
                {reviewWindow.trade_review_submitted ? 'submitted' : 'pending'}
              </p>
              <p className="text-sm text-gray-700">
                {reviewWindow.client_review_submitted ? '✓' : '○'} Client review{' '}
                {reviewWindow.client_review_submitted ? 'submitted' : 'pending'}
              </p>
              <p className="text-xs text-gray-400 mt-2">Closes {fmt(reviewWindow.window_closes_at ?? reviewWindow.blind_window_closes_at)}</p>
            </div>
          </section>
        )}

        {/* Waiting on the client */}
        {status === 'pending_confirmation' && (
          <section className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5">
            <div>
              <h2 className="text-base font-semibold text-brand-navy">Your client has not confirmed yet</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Until they confirm, this job gives you no agreed record and does not count towards your reputation.
                A quick message from you is the best way to get it confirmed.
              </p>
            </div>
            <RemindClientButton jobId={job.id} canEmail={!!invite?.invitee_email} />
            <InviteMessage />
          </section>
        )}

        {/* Mark as complete */}
        {status === 'active' && (
          <form action={completeJob}>
            <input type="hidden" name="job_id" value={job.id} />
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-navy px-6 py-4 text-base font-semibold text-white
                hover:opacity-90 transition-opacity"
            >
              Mark as complete
            </button>
            <p className="mt-2 text-xs text-center text-gray-400">
              You will both be asked for a review. Reviews stay hidden until you have both submitted, or for 7 days.
            </p>
          </form>
        )}

        {/* Review you received */}
        {receivedReview && (
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-brand-navy">Review from your client</h2>
            </div>
            <div className="px-6 py-4 space-y-2">
              {receivedReview.overall_rating !== null && (
                <p className="text-sm font-semibold text-brand-navy">
                  <span className="text-brand-amber">{'★'.repeat(Math.round(receivedReview.overall_rating))}</span>
                  <span className="text-gray-200">{'★'.repeat(5 - Math.round(receivedReview.overall_rating))}</span>{' '}
                  {receivedReview.overall_rating.toFixed(1)}
                </p>
              )}
              {receivedReview.written_review && (
                <p className="text-sm leading-relaxed text-gray-700">{receivedReview.written_review}</p>
              )}
              <p className="pt-1 text-xs text-gray-500">
                {receivedReview.dispute_status === 'none' ? (
                  disputeOpen ? (
                    <>
                      Think this review is unfair or wrong?{' '}
                      <a href={`/reviews/${receivedReview.id}/dispute`} className="font-semibold text-brand-navy underline">
                        Dispute this review
                      </a>{' '}
                      (open until {fmt(disputeClosesAt)})
                    </>
                  ) : (
                    'The 14 day window to dispute this review has closed.'
                  )
                ) : (
                  'This review has a dispute on record. Our team will be in touch.'
                )}
              </p>
            </div>
          </section>
        )}

        {/* Leave review CTA */}
        {status === 'completed' && reviewWindow && !reviewWindow.trade_review_submitted &&
          (!reviewWindow.window_closes_at || new Date(reviewWindow.window_closes_at) > new Date()) && (
          <a
            href={`/jobs/${job.id}/review`}
            className="block w-full text-center rounded-xl bg-brand-amber px-6 py-4 text-base font-semibold text-brand-navy
              hover:opacity-90 transition-opacity"
          >
            Leave your review
          </a>
        )}

        {/* Report incorrect claim — shown if this job originated from the claim flow */}
        {pendingInviteClaim && pendingInviteClaim.status === 'claimed' && (
          <div className="text-center pt-2">
            <ReportClaimButton jobId={job.id} />
          </div>
        )}
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 px-6 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
