import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fromStoredType } from '@/lib/clients/accounts'
import { AccountTypeForm } from './account-type-form'

export const metadata = { title: 'Who is this for? | WorkedWith' }

export default async function AccountTypePage({ searchParams }: { searchParams: { next?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in/code')
  const admin = createAdminClient()
  const { data: cp } = await admin.from('client_profiles').select('client_type, company_name').eq('user_id', user.id).maybeSingle()
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/my/jobs'
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Who is the work for?</h1>
        <p className="mt-1 text-sm text-gray-600">The trade has picked one, but you know best. You can change this from your account later.</p>
      </div>
      <AccountTypeForm initial={fromStoredType(cp?.client_type as string | null)} initialCompany={(cp?.company_name as string | null) ?? ''} next={next} />
    </main>
  )
}
