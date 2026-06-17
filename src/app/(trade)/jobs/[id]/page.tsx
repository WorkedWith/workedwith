import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { completeJob } from '@/actions/complete-job'
import type { JobStatus } from '@/types/database'

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
  if (!job) redirect('/dashboard')

  // Verify this user owns the trade profile
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('id', job.trade_profile_id)
    .single()

  if (!tradeProfile || tradeProfile.user_id !== user.id) redirect('/dashboard')

  // Fetch invite, client profile, review window in parallel
  const [{ data: invite }, { data: reviewWindow }] = await Promise.all([
    admin.from('job_invites').select('*').eq('job_id', id).maybeSingle(),
    admin.from('review_windows').select('*').eq('job_id', id).maybeSingle(),
  ])

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

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <a href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">{job.job_type}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{job.postcode ?? '—'}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOURS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        {/* Details card */}
        <section className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <Row label="Job type" value={job.job_type} />
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
              <p className="text-xs text-gray-400 mt-2">Closes {fmt(reviewWindow.window_closes_at)}</p>
            </div>
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
              This opens a 30-day review window for both you and your client.
            </p>
          </form>
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
