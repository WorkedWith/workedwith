import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimTradeInvite } from '@/actions/claim-trade-invite'
import type { PendingInvite } from '@/types/database'

export const metadata = { title: 'Claim your job invite | WorkedWith', robots: { index: false } }

type PageProps = { params: Promise<{ token: string }> }

// ── Shell ─────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────

export default async function ClaimInvitePage({ params }: PageProps) {
  const { token } = await params
  const admin = createAdminClient()

  // Load the invite
  const { data: rawInvite } = await admin
    .from('pending_invites')
    .select('*')
    .eq('claim_token', token)
    .maybeSingle()

  if (!rawInvite) {
    return (
      <Shell>
        <ErrorCard
          title="Invite not found"
          message="This claim link is invalid or has already been removed. Contact the person who sent it if you think this is a mistake."
        />
      </Shell>
    )
  }

  const invite = rawInvite as unknown as PendingInvite

  if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <ErrorCard
          title="Invite expired"
          message={`This invite expired on ${new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Contact the client to send a new one.`}
        />
      </Shell>
    )
  }

  if (invite.status === 'disputed') {
    return (
      <Shell>
        <ErrorCard
          title="Claim under review"
          message="This invite claim has been reported and is under admin review. No action is needed from you."
        />
      </Shell>
    )
  }

  // Fetch inviting client's display name
  const { data: clientUser } = await admin
    .from('users')
    .select('full_name')
    .eq('id', invite.inviting_client_id)
    .single()
  const { data: clientProfile } = await admin
    .from('client_profiles')
    .select('display_name, company_name')
    .eq('user_id', invite.inviting_client_id)
    .maybeSingle()

  const clientName =
    (clientProfile as { display_name: string | null; company_name: string | null } | null)?.display_name ??
    (clientProfile as { display_name: string | null; company_name: string | null } | null)?.company_name ??
    (clientUser as { full_name: string } | null)?.full_name ??
    'A client'

  // If already claimed, show success state with link to job
  if (invite.status === 'claimed' && invite.resulting_job_id) {
    return (
      <Shell>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-brand-navy">Job already claimed</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            This {invite.job_type} job from {clientName} has already been claimed.
          </p>
          <a
            href={`/sign-in?next=/jobs/${invite.resulting_job_id}`}
            className="mt-6 inline-block w-full rounded-lg bg-brand-amber py-3 text-center text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
          >
            Sign in to view job
          </a>
        </div>
      </Shell>
    )
  }

  // Check auth state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated: show landing card
  if (!user) {
    const signInHref = `/sign-in?next=${encodeURIComponent(`/invite/claim/${token}`)}`
    const joinHref = `/join/trade?claim_token=${encodeURIComponent(token)}&prefill_trade=${encodeURIComponent(invite.job_type)}&prefill_company=${encodeURIComponent(invite.trade_name)}`

    return (
      <main className="min-h-screen bg-gray-50">
        {/* Navy hero */}
        <div className="bg-brand-navy px-4 pb-14 pt-10 text-center">
          <a href="/" className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <h1 className="mt-8 text-2xl font-bold text-white sm:text-3xl">
            {clientName} says you worked together
          </h1>
          <p className="mt-3 text-base text-white/70 max-w-sm mx-auto leading-relaxed">
            They logged a <span className="font-medium text-white">{invite.job_type}</span> job in{' '}
            <span className="font-medium text-white">{invite.job_date}</span>. Claim it and the job is confirmed,
            so you can leave each other verified reviews.
          </p>
        </div>

        <div className="mx-auto max-w-md px-4 -mt-4 pb-12">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">How claiming works</p>
            <div className="space-y-4 mb-7">
              <Step n={1} label="Sign in or create a free account" subtext="It takes a couple of minutes" />
              <Step n={2} label="The job is confirmed for you" subtext="Nothing to fill in, we already have the details" />
              <Step n={3} label="Leave your review" subtext="You both review each other privately, and reviews go live together" />
            </div>

            <a
              href={joinHref}
              className="block w-full rounded-lg bg-brand-amber py-3.5 text-center text-base font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Create a free account to claim
            </a>

            <a
              href={signInHref}
              className="mt-4 block text-center text-sm text-gray-500 hover:text-brand-navy transition-colors"
            >
              Already on WorkedWith?{' '}
              <span className="font-medium text-brand-navy">Sign in to claim</span>
            </a>

            <p className="mt-6 text-center text-xs text-gray-400">
              Nothing is published until you claim. Invite expires{' '}
              {new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Authenticated: check if they have a trade profile
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradeProfile) {
    redirect(
      `/onboarding/trade?redirect=${encodeURIComponent(`/invite/claim/${token}`)}`,
    )
  }

  // Execute the claim
  const result = await claimTradeInvite(token)

  if (result.success) {
    const primaryJobId = result.jobIds[0]
    return (
      <Shell>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-brand-navy">
            {result.claimedCount > 1 ? `${result.claimedCount} jobs claimed` : 'Job claimed'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            {result.claimedCount > 1
              ? `You've claimed ${result.claimedCount} pending jobs in one go. You and the clients can now leave each other verified reviews.`
              : `Your ${invite.job_type} job from ${clientName} is now confirmed. Leave your review now. Reviews go live together once you have both submitted, or after 7 days.`}
          </p>
          <a
            href={`/jobs/${primaryJobId}/review`}
            className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy text-center hover:opacity-90 transition-opacity"
          >
            Leave your review
          </a>
          {result.claimedCount > 1 && (
            <a
              href="/dashboard"
              className="mt-3 inline-block w-full text-center text-sm text-gray-500 hover:text-brand-navy transition-colors"
            >
              Go to dashboard to see all jobs
            </a>
          )}
        </div>
      </Shell>
    )
  }

  // Claim failed
  const errorMessages: Record<string, string> = {
    no_match: result.error,
    no_profile: 'You need a trade profile to claim this invite.',
    already_claimed: 'This invite has already been claimed.',
    expired: 'This invite has expired.',
    server_error: 'Something went wrong. Please try again or contact support.',
  }

  return (
    <Shell>
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
        <ErrorCard
          title={result.code === 'no_match' ? 'Invite sent to someone else' : 'Unable to claim'}
          message={errorMessages[result.code] ?? result.error}
        />
        {result.code === 'no_match' && (
          <p className="mt-4 text-xs text-gray-400">
            If you believe this is an error, please contact{' '}
            <a href="mailto:hello@workedwith.co.uk" className="underline">hello@workedwith.co.uk</a>.
          </p>
        )}
      </div>
    </Shell>
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
