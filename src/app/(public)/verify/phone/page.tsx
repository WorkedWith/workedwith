import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PhoneVerifyForm } from './phone-verify-form'

export const metadata = {
  title: 'Verify your mobile | WorkedWith',
}

export default async function VerifyPhonePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.phone_verified) {
    redirect('/dashboard')
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

        <PhoneVerifyForm />

        <p className="mt-6 text-center text-xs text-white/40">
          Standard SMS rates may apply. UK mobiles only.
        </p>
      </div>
    </main>
  )
}
