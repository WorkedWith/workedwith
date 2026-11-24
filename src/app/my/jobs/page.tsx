import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientJobsList } from './client-jobs-list'

export const metadata = { title: 'My jobs | WorkedWith' }

export default async function MyJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in/code')
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-6 sm:px-6">
      <h1 className="text-2xl font-bold text-brand-navy">My jobs</h1>
      <ClientJobsList userId={user.id} />
    </main>
  )
}
