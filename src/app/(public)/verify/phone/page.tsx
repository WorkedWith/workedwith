import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PhoneVerifyForm } from './phone-verify-form'

export const metadata = {
  title: 'Verify your mobile | WorkedWith',
}

type PageProps = { searchParams: Promise<{ claim_token?: string; seeded_token?: string; next?: string }> }

export default async function VerifyPhonePage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { claim_token, seeded_token, next } = await searchParams

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.phone_verified) {
    if (next?.startsWith('/')) redirect(next)
    if (seeded_token) redirect(`/onboarding/trade?seeded_token=${encodeURIComponent(seeded_token)}`)
    if (claim_token) redirect(`/invite/claim/${claim_token}`)
    redirect('/dashboard')
  }

  let nextUrl: string | undefined
  if (next?.startsWith('/')) {
    nextUrl = next
  } else if (seeded_token) {
    nextUrl = `/onboarding/trade?seeded_token=${encodeURIComponent(seeded_token)}`
  } else if (claim_token) {
    nextUrl = `/invite/claim/${claim_token}`
  }

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Verify your mobile
          </h1>
          <p className="mt-2 text-sm text-white/60">
            A verified number increases trust on your profile.
          </p>
        </div>

        <PhoneVerifyForm nextUrl={nextUrl} />

        <p className="mt-6 text-center text-xs text-white/40">
          Standard SMS rates may apply. UK mobiles only.
        </p>
      </div>
    </main>
  )
}
