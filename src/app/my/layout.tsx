import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/app-header'

/** Client area (PRD 18: My jobs, Find a trade, My record). Designed for a phone first. */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in/code')
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      {children}
    </div>
  )
}
