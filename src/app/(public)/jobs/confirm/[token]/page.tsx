import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmJob } from '@/actions/confirm-job'

export const metadata = { title: 'Confirm job | WorkedWith' }

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

function ErrorCard({ title, message, action }: {
  title: string
  message: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      {action && (
        <a
          href={action.href}
          className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}

function SuccessCard({ tradePersonName, isBackdated, jobId }: {
  tradePersonName: string
  isBackdated: boolean
  jobId: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
        <svg className="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-brand-navy">
        {isBackdated ? 'Past job confirmed' : 'Job confirmed'}
      </h2>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
        {isBackdated
          ? <>Check your email — you can both leave reviews for your job with <span className="font-medium text-brand-navy">{tradePersonName}</span> now.</>
          : <>You&apos;ll be asked to review <span className="font-medium text-brand-navy">{tradePersonName}</span> once the job is complete.</>}
      </p>
      <a
        href={isBackdated ? `/jobs/${jobId}` : '/dashboard'}
        className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
      >
        {isBackdated ? 'View job and leave reviews' : 'Go to dashboard'}
      </a>
    </div>
  )
}

function NoProfileCard({ token }: { token: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <svg className="h-6 w-6 text-amber-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-brand-navy">
        You need to complete your profile first
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        To confirm this job and leave a review, you need to set up your WorkedWith trade profile. It only takes a minute.
      </p>
      <a
        href={`/onboarding/trade?redirect=${encodeURIComponent(`/jobs/confirm/${token}`)}`}
        className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
      >
        Set up my trade profile
      </a>
      <p className="mt-4 text-sm text-gray-500">
        Not a tradesperson?{' '}
        <a href="/join/client/individual" className="font-medium text-brand-amber hover:underline">
          Join as a client instead
        </a>
      </p>
    </div>
  )
}

const errorTitles: Record<string, string> = {
  invalid:           'Invalid invitation',
  expired:           'Invitation expired',
  already_confirmed: 'Already confirmed',
  no_profile:        'Profile needed',
  auth_required:     'Sign in required',
  unverified:        'Verification required',
  server_error:      'Something went wrong',
}

export default async function ConfirmJobPage({ params }: { params: { token: string } }) {
  const { token } = params

  // Pre-check the invite before auth so unauthenticated users get clear errors too
  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('job_invites')
    .select('*')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) {
    return (
      <Shell>
        <ErrorCard
          title="Invalid invitation"
          message="This job invitation link is invalid or has been revoked."
        />
      </Shell>
    )
  }

  if (invite.status !== 'pending') {
    return (
      <Shell>
        <ErrorCard
          title="Already confirmed"
          message="This job has already been confirmed."
          action={{ label: 'Go to dashboard', href: '/dashboard' }}
        />
      </Shell>
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <ErrorCard
          title="Invitation expired"
          message={`This invitation expired on ${new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Please ask the tradesperson to send a new invite.`}
        />
      </Shell>
    )
  }

  // Check auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/join/client/individual?token=${encodeURIComponent(token)}`)
  }

  // Ensure the logged-in account matches the invited email
  if (invite.invitee_email && user.email !== invite.invitee_email) {
    await supabase.auth.signOut()
    redirect(`/sign-in?message=Please sign in with ${invite.invitee_email} to accept this job invite&next=/jobs/confirm/${token}`)
  }

  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || userData.verification_tier === 'unverified') {
    redirect('/verify/phone')
  }

  // Attempt to confirm
  const result = await confirmJob(token)

  if (result.success) {
    return (
      <Shell>
        <SuccessCard
          tradePersonName={result.tradePersonName}
          isBackdated={result.isBackdated}
          jobId={result.jobId}
        />
      </Shell>
    )
  }

  if (!result.success && result.code === 'no_profile') {
    return (
      <Shell>
        <NoProfileCard token={token} />
      </Shell>
    )
  }

  return (
    <Shell>
      <ErrorCard
        title={errorTitles[result.code] ?? 'Error'}
        message={result.error}
        action={result.code === 'already_confirmed' ? { label: 'Go to dashboard', href: '/dashboard' } : undefined}
      />
    </Shell>
  )
}
