import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserMenu } from '@/components/user-menu'
import { ProfileForm } from './profile-form'
import type { User, TradeProfile, ClientProfile } from '@/types/database'

export const metadata = { title: 'My profile — WorkedWith' }

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
      </div>
    </main>
  )
}
