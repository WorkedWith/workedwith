import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { UserMenu } from '@/components/user-menu'
import { AppNav, type NavLink } from '@/components/app-nav'

function linksFor(userType: string | null): NavLink[] {
  if (userType === 'trade' || userType === 'both') {
    return [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/search', label: 'Client lookup' },
      { href: '/profile', label: 'Profile' },
      { href: '/settings', label: 'Settings' },
    ]
  }
  if (userType === 'client_business') {
    return [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/org/members', label: 'Members' },
      { href: '/find', label: 'Find a tradesperson', shortLabel: 'Find a trade' },
      { href: '/profile', label: 'Profile' },
      { href: '/settings', label: 'Settings' },
    ]
  }
  return [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/find', label: 'Find a tradesperson', shortLabel: 'Find a trade' },
    { href: '/profile', label: 'Profile' },
    { href: '/settings', label: 'Settings' },
  ]
}

export async function AppHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userType: string | null = null
  if (user) {
    const admin = createAdminClient()
    const { data } = await admin.from('users').select('user_type').eq('id', user.id).single()
    userType = data ? (data.user_type as string | null) : null
  }

  return (
    <header className="sticky top-0 z-40 bg-brand-navy">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="/dashboard" className="text-xl font-bold tracking-tight text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
      {user && <AppNav links={linksFor(userType)} />}
    </header>
  )
}
