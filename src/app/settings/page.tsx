import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserMenu } from '@/components/user-menu'
import { SettingsContent } from './settings-content'

export const metadata = { title: 'Settings — WorkedWith' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: rawUser } = await admin.from('users').select('user_type').eq('id', user.id).single()
  const userType = rawUser ? (rawUser.user_type as string | null) : null

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
        <h1 className="mb-6 text-2xl font-bold text-brand-navy">Settings</h1>
        <SettingsContent email={user.email ?? ''} userType={userType} />
      </div>
    </main>
  )
}
