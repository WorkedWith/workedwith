import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { IdentityUploadForm } from './identity-upload-form'
import type { User } from '@/types/database'

export const metadata: Metadata = { title: 'Verify Your Identity — WorkedWith' }

export default async function VerifyIdentityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: userData } = await admin
    .from('users')
    .select('phone_verified, verification_tier, id_verification_status')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/dashboard')

  const { phone_verified, verification_tier, id_verification_status } =
    userData as unknown as Pick<User, 'phone_verified' | 'verification_tier' | 'id_verification_status'>

  if (!phone_verified) redirect('/verify/phone')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <a href="/dashboard" className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <a href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Identity verification</h1>
          <p className="mt-1 text-sm text-gray-500">
            Earn your Verified badge and build client trust.
          </p>
        </div>

        {verification_tier === 'fully_verified' ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-sm font-bold">✓</span>
              <div>
                <p className="font-semibold text-green-900">Your identity is verified</p>
                <p className="mt-0.5 text-sm text-green-700">Your Verified badge is live on your profile.</p>
              </div>
            </div>
          </div>
        ) : id_verification_status === 'pending' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-semibold text-amber-900">Your ID is under review</p>
            <p className="mt-1 text-sm text-amber-700 leading-relaxed">
              We will notify you within 1 to 2 working days. No action is needed from you right now.
            </p>
          </div>
        ) : (
          <>
            {id_verification_status === 'rejected' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-semibold text-amber-900">Your ID verification was unsuccessful</p>
                <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                  Please upload a clear photo and try again.
                </p>
              </div>
            )}
            <IdentityUploadForm />
          </>
        )}
      </div>
    </main>
  )
}
