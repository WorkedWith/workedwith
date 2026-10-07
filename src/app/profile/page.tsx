import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserMenu } from '@/components/user-menu'
import { ProfileForm } from './profile-form'
import type { User, TradeProfile, ClientProfile } from '@/types/database'

export const metadata = { title: 'My profile — WorkedWith', robots: { index: false } }

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

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-40 bg-brand-navy px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="/dashboard" className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <UserMenu />
        </div>
      </nav>

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
              postcode: tradeProfile.postcode,
              trade_types: tradeProfile.trade_types,
              bio: tradeProfile.bio,
              years_experience: tradeProfile.years_experience,
              public_slug: tradeProfile.public_slug,
            } : null}
            clientProfile={clientProfile ? {
              postcode: clientProfile.postcode,
              display_name: clientProfile.display_name,
            } : null}
          />
        </div>

        {tradeProfile && (
          <>
            <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-brand-navy">Where you work</h2>
                <a
                  href="/profile/areas"
                  className="rounded-lg border border-brand-navy px-3 py-1.5 text-sm font-semibold text-brand-navy hover:bg-gray-50"
                >
                  Edit areas
                </a>
              </div>
              {(tradeProfile.operating_areas ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(tradeProfile.operating_areas ?? []).map(district => (
                    <span
                      key={district}
                      className="rounded-full bg-brand-navy/10 px-3 py-1 text-sm font-medium text-brand-navy"
                    >
                      {district}
                      {(tradeProfile.boosted_districts ?? []).includes(district) ? ' (boosted)' : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No areas yet. Add the postcode districts you cover so clients can find you.
                </p>
              )}
            </section>

            <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-brand-navy">Your plan</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Current plan: <span className="font-medium capitalize text-gray-700">{tradeProfile.subscription_tier ?? 'free'}</span>
                  </p>
                </div>
                <a
                  href="/subscription"
                  className="rounded-lg bg-brand-amber px-3 py-1.5 text-sm font-bold text-brand-navy hover:bg-amber-400"
                >
                  Manage plan
                </a>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
