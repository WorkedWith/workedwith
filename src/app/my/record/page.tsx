import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeClientRecord } from '@/lib/client-record/record'
import { ClientRecordView } from '@/components/client-record/client-record-view'
import { Card } from '@/components/ui'

export const metadata = { title: 'My record | WorkedWith' }

/** The client's own full record (PRD 14), and account details including person or company. */
export default async function MyRecordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in/code')
  const admin = createAdminClient()
  const r = await computeClientRecord(admin, user.id)
  if (!r) redirect('/my/jobs')
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-28 pt-5">
      <h1 className="text-2xl font-bold text-brand-navy">My record</h1>
      <p className="text-sm text-gray-600">Trades you quote with, or who look you up by your email or mobile, see this. It is never public and can’t be searched by name.</p>
      <Card><ClientRecordView r={r} forClient /></Card>
      <Card>
        <p className="text-sm text-gray-700">Account type: <strong>{r.kind === 'company' ? `Company${r.company ? `, ${r.company}` : ''}` : 'Person'}</strong></p>
        <a href="/my/account-type?next=/my/record" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-navy underline">Change</a>
      </Card>
    </main>
  )
}
