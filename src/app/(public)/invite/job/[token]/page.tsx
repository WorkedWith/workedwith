import { createAdminClient } from '@/lib/supabase/admin'
import type { Job, JobInvite } from '@/types/database'

export const metadata = { title: 'You have a job to confirm — WorkedWith' }

type InviteRow = Pick<JobInvite, 'id' | 'job_id' | 'inviter_id' | 'status' | 'expires_at' | 'invite_token'>
type JobRow = Pick<Job, 'id' | 'job_type' | 'backdated_period' | 'started_at' | 'initiated_by' | 'trade_profile_id' | 'client_profile_id'>

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-brand-navy px-4 py-10 text-center">
        <a href="/" className="text-2xl font-bold tracking-tight text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
      </div>
      <div className="mx-auto max-w-md px-4 py-10">{children}</div>
    </main>
  )
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{message}</p>
    </div>
  )
}

function Step({ n, label, subtext }: { n: number; label: string; subtext: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
        {n}
      </span>
      <div>
        <p className="text-sm font-semibold text-brand-navy">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>
      </div>
    </div>
  )
}

export default async function InviteJobPage({ params }: { params: { token: string } }) {
  const { token } = params
  const admin = createAdminClient()

  const { data: rawInvite } = await admin
    .from('job_invites')
    .select('id, job_id, inviter_id, status, expires_at, invite_token')
    .eq('invite_token', token)
    .maybeSingle()

  if (!rawInvite) {
    return (
      <Shell>
        <ErrorCard
          title="Invitation not found"
          message="This link is invalid or has been revoked. Please ask the person who sent it to resend the invite."
        />
      </Shell>
    )
  }

  const invite = rawInvite as unknown as InviteRow

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <ErrorCard
          title="Invitation expired"
          message={`This invitation expired on ${new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Please ask them to send a new invite.`}
        />
      </Shell>
    )
  }

  if (invite.status !== 'pending') {
    return (
      <Shell>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-brand-navy">Job already confirmed</h2>
          <p className="mt-2 text-sm text-gray-500">This job has already been confirmed.</p>
          <a
            href={`/sign-in?next=/jobs/confirm/${token}`}
            className="mt-6 inline-block text-sm font-medium text-brand-amber hover:underline"
          >
            Sign in to view it →
          </a>
        </div>
      </Shell>
    )
  }

  // Fetch job + inviter in parallel
  const [{ data: rawJob }, { data: rawInviter }] = await Promise.all([
    admin.from('jobs').select('id, job_type, backdated_period, started_at, initiated_by, trade_profile_id, client_profile_id').eq('id', invite.job_id).maybeSingle(),
    admin.from('users').select('full_name').eq('id', invite.inviter_id).maybeSingle(),
  ])

  if (!rawJob) {
    return (
      <Shell>
        <ErrorCard
          title="Job not found"
          message="The job linked to this invitation could not be found. It may have been removed."
        />
      </Shell>
    )
  }

  const job = rawJob as unknown as JobRow
  const inviterFallbackName = (rawInviter as unknown as { full_name: string } | null)?.full_name ?? 'Someone'

  // Resolve the inviter's display name from their profile
  let inviterName = inviterFallbackName
  if (job.initiated_by === 'trade' && job.trade_profile_id) {
    const { data: tp } = await admin.from('trade_profiles').select('company_name').eq('id', job.trade_profile_id).maybeSingle()
    const companyName = (tp as unknown as { company_name: string | null } | null)?.company_name
    if (companyName) inviterName = companyName
  } else if (job.initiated_by === 'client' && job.client_profile_id) {
    const { data: cp } = await admin.from('client_profiles').select('display_name, company_name').eq('id', job.client_profile_id).maybeSingle()
    const profile = cp as unknown as { display_name: string | null; company_name: string | null } | null
    inviterName = profile?.display_name ?? profile?.company_name ?? inviterFallbackName
  }

  // Format the job period
  const jobPeriod = job.backdated_period
    ?? (job.started_at ? new Date(job.started_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null)
    ?? 'recently'

  // CTA: route new user to the correct join flow
  const joinHref = job.initiated_by === 'client'
    ? `/join/trade?token=${encodeURIComponent(token)}`
    : `/join/client/individual?token=${encodeURIComponent(token)}`

  const signInHref = `/sign-in?next=${encodeURIComponent(`/jobs/confirm/${token}`)}`

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navy hero */}
      <div className="bg-brand-navy px-4 pb-14 pt-10 text-center">
        <a href="/" className="text-2xl font-bold tracking-tight text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <h1 className="mt-8 text-2xl font-bold text-white sm:text-3xl">
          {inviterName} worked with you — join to confirm it
        </h1>
        <p className="mt-3 text-base text-white/70 max-w-sm mx-auto leading-relaxed">
          They logged a <span className="font-medium text-white">{job.job_type}</span> job
          {jobPeriod !== 'recently' ? ` in ${jobPeriod}` : ''}. Confirm it happened and leave each other verified reviews.
        </p>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-md px-4 -mt-4 pb-12">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">How it works</p>

          <div className="space-y-5">
            <Step n={1} label="Create your free account" subtext="Takes 2 minutes" />
            <Step n={2} label="Confirm the job happened" subtext="One click confirmation" />
            <Step n={3} label="Leave your review" subtext="Rate your experience, they rate theirs" />
          </div>

          <a
            href={joinHref}
            className="mt-8 block w-full rounded-lg bg-brand-amber py-3.5 text-center text-base font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
          >
            Create a free account
          </a>

          <a
            href={signInHref}
            className="mt-4 block text-center text-sm text-gray-500 hover:text-brand-navy transition-colors"
          >
            Already have a WorkedWith account?{' '}
            <span className="font-medium text-brand-navy">Sign in</span>
          </a>

          <p className="mt-6 text-center text-xs text-gray-400">
            WorkedWith is free to join. This invitation expires in 14 days.
          </p>
        </div>
      </div>
    </main>
  )
}
