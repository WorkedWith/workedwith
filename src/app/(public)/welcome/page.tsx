import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PricingCards } from './pricing-cards'
import type { User } from '@/types/database'

export const metadata = { title: 'Welcome to WorkedWith' }

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('user_type').eq('id', user.id).single()
  const userType = (userData as unknown as Pick<User, 'user_type'> | null)?.user_type

  if (userType !== 'trade' && userType !== 'both') redirect('/dashboard')

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navy header */}
      <div className="bg-brand-navy px-4 pb-16 pt-12 text-center sm:px-6">
        <a href="/dashboard" className="text-2xl font-bold tracking-tight text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <h1 className="mt-8 text-3xl font-bold text-white sm:text-4xl">
          Your WorkedWith profile is live
        </h1>
        <p className="mt-3 text-lg text-white/70">
          Choose how you want to use WorkedWith
        </p>
      </div>

      <PricingCards />
    </main>
  )
}
