import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/components/app-header'
import { ProfileForm } from './profile-form'
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
      <main className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
          <div className="rounded-2xl border border-brand-amber/50 bg-amber-50 p-5">
            <h1 className="text-lg font-bold text-brand-navy">This is how clients see your profile</h1>
            <p className="mt-1 text-sm text-amber-900">
              Keep it complete. Profiles with a photo, a short bio and your work on show get more attention.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <a href="/profile/edit" className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400">
                Edit details
              </a>
              <a href="/profile/areas" className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-white">
                Edit areas
              </a>
              <a href="/profile/featured-jobs" className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-white">
                Photos of your work
              </a>
              <a href={`/t/${tradeProfile.public_slug}`} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-white">
                Open public page
              </a>
            </div>
          </div>
        </div>
        <TradeProfileView slug={tradeProfile.public_slug} preview />
      </main>
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
