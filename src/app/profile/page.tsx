import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/components/app-header'
import { ProfileForm } from './profile-form'
import { VerifyIdPrompt } from '@/components/verify-id-prompt'
import { ClientProfileView } from './client-profile-view'
import { TradeProfileView } from '@/app/(public)/t/[slug]/profile-view'
import type { User, TradeProfile, ClientProfile } from '@/types/database'

export const metadata = { title: 'My profile | WorkedWith', robots: { index: false } }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: rawUser } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!rawUser) redirect('/sign-in')

  const userData = rawUser as unknown as User
  const isTrade = userData.user_type === 'trade' || userData.user_type === 'both'

  const [{ data: rawTrade }, { data: rawClient }] = await Promise.all([
    isTrade
      ? admin.from('trade_profiles').select('*').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    !isTrade
      ? admin.from('client_profiles').select('*').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const tradeProfile = rawTrade as unknown as TradeProfile | null
  const clientProfile = rawClient as unknown as ClientProfile | null

  if (isTrade && tradeProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-6 sm:px-6">
          <h1 className="text-xl font-bold text-brand-navy">My profile</h1>
          <a
            href="/profile/edit"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400"
          >
            Edit profile
          </a>
        </div>
        <p className="mx-auto max-w-2xl px-4 pb-4 pt-1 text-sm text-gray-500 sm:px-6">
          This is how clients see you.
        </p>
        {userData.verification_tier !== 'fully_verified' && userData.id_verification_status !== 'pending' && (
          <div className="mx-auto max-w-2xl px-4 pb-4 sm:px-6">
            <VerifyIdPrompt phoneVerified={userData.phone_verified} />
          </div>
        )}
        <TradeProfileView slug={tradeProfile.public_slug} preview />
      </div>
    )
  }

  if (!isTrade && clientProfile && userData.user_type === 'client_individual') {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <AppHeader />
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-6 sm:px-6">
          <h1 className="text-xl font-bold text-brand-navy">My profile</h1>
          <a
            href="/profile/edit"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400"
          >
            Edit profile
          </a>
        </div>
        <p className="mx-auto max-w-2xl px-4 pb-4 pt-1 text-sm text-gray-500 sm:px-6">
          This is how trades see you when they look you up.
        </p>
        <ClientProfileView userId={user.id} fullName={userData.full_name} clientProfile={clientProfile} />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-brand-navy">My profile</h1>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <ProfileForm
            user={{
              full_name: userData.full_name,
              email: userData.email,
              phone: userData.phone,
              phone_verified: userData.phone_verified,
              user_type: userData.user_type,
              profile_photo_url: userData.profile_photo_url,
            }}
            tradeProfile={tradeProfile ? {
              company_name: tradeProfile.company_name,
              trade_types: tradeProfile.trade_types,
              bio: tradeProfile.bio,
              years_experience: tradeProfile.years_experience,
              public_slug: tradeProfile.public_slug,
            } : null}
            clientProfile={clientProfile ? {
              postcode: clientProfile.postcode,
              display_name: clientProfile.display_name,
              username: clientProfile.username,
            } : null}
          />
        </div>

      </div>
    </main>
  )
}
