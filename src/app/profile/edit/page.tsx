import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppHeader } from '@/components/app-header'
import { BackLink } from '@/components/back-link'
import { ProfileForm } from '../profile-form'
import type { User, TradeProfile } from '@/types/database'

export const metadata = { title: 'Edit profile | WorkedWith', robots: { index: false } }

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: rawUser } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!rawUser) redirect('/sign-in')

  const userData = rawUser as unknown as User
  const isTrade = userData.user_type === 'trade' || userData.user_type === 'both'
  if (!isTrade) redirect('/profile')

  const { data: rawTrade } = await admin.from('trade_profiles').select('*').eq('user_id', user.id).maybeSingle()
  const tradeProfile = rawTrade as unknown as TradeProfile | null
  if (!tradeProfile) redirect('/onboarding/trade')

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <BackLink href="/profile" label="Back to my profile" />
        <h1 className="mb-6 text-2xl font-bold text-brand-navy">Edit your profile</h1>
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
            tradeProfile={{
              company_name: tradeProfile.company_name,
              trade_types: tradeProfile.trade_types,
              bio: tradeProfile.bio,
              years_experience: tradeProfile.years_experience,
              public_slug: tradeProfile.public_slug,
            }}
            clientProfile={null}
          />
        </div>
      </div>
    </main>
  )
}
