import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptInvite } from '@/actions/accept-invite'

export const metadata = { title: 'Accept invitation | WorkedWith' }

// ── Small presentational components ──────────────────────────

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

function ErrorCard({
  title,
  message,
  action,
}: {
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
          className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default async function AcceptInvitePage({
  params,
}: {
  params: { token: string }
}) {
  const { token } = params

  // Look up invite first so we can give meaningful errors even before auth checks
  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('organisation_invites')
    .select('*')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) {
    return (
      <Shell>
        <ErrorCard
          title="Invalid invitation"
          message="This invitation link is invalid or has been revoked. Please ask your administrator to send a new one."
        />
      </Shell>
    )
  }

  if (invite.accepted_at) {
    return (
      <Shell>
        <ErrorCard
          title="Already accepted"
          message="This invitation has already been used."
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
          message="This invitation expired on ${new Date(invite.expires_at).toLocaleDateString('en-GB')}. Please ask your administrator to send a new one."
        />
      </Shell>
    )
  }

  // Check auth state
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not signed in → send to signup/login with token preserved
  if (!user) {
    redirect(`/join/client?token=${encodeURIComponent(token)}`)
  }

  const { data: userData } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Not phone-verified → send to verify first
  if (!userData || userData.verification_tier === 'unverified') {
    redirect('/verify/phone')
  }

  // Signed in and verified — attempt to accept
  const result = await acceptInvite(token)

  if (result.success) {
    redirect('/dashboard')
  }

  // Show typed error
  const errorTitles: Record<string, string> = {
    email_mismatch:  'Wrong account',
    already_member:  'Already a member',
    server_error:    'Something went wrong',
    invalid:         'Invalid invitation',
    expired:         'Invitation expired',
    already_used:    'Already accepted',
    auth_required:   'Sign in required',
    unverified:      'Verification required',
  }

  return (
    <Shell>
      <ErrorCard
        title={errorTitles[result.code] ?? 'Error'}
        message={result.error}
        action={result.code === 'already_member' ? { label: 'Go to dashboard', href: '/dashboard' } : undefined}
      />
    </Shell>
  )
}
