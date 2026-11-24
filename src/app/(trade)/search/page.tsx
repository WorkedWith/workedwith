import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { lookupClient } from '@/actions/client-lookup'
import { ClientRecordView } from '@/components/client-record/client-record-view'
import { Card, Notice, PageShell, PageTitle } from '@/components/ui'

export const metadata = { title: 'Client lookup | WorkedWith' }

/** Look up a client by exact email or mobile before quoting (PRD 14). */
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const q = searchParams.q?.trim() ?? ''
  const result = q ? await lookupClient(q) : null
  if (result?.status === 'unauthorized') redirect('/dashboard')
  return (
    <PageShell>
      <PageTitle title="Client lookup" sub="Enter the client’s exact email address or mobile number to see their record from WorkedWith jobs. Up to 20 lookups a day; every lookup is logged." />
      <Card>
        <form method="GET" className="flex flex-col gap-2 sm:flex-row">
          <input name="q" defaultValue={q} required autoComplete="off" placeholder="name@example.com or 07700 900123" aria-label="Email or mobile" className="min-h-[48px] flex-1 rounded-xl border border-gray-300 px-3.5 text-base" />
          <button className="min-h-[48px] rounded-xl bg-brand-amber px-6 font-semibold text-brand-navy">Look up</button>
        </form>
      </Card>
      {result?.status === 'invalid' && <Notice tone="amber">{result.error}</Notice>}
      {result?.status === 'rate_limited' && <Notice tone="red">You have used your 20 lookups for the last 24 hours. Try again later.</Notice>}
      {result?.status === 'not_found' && <Notice tone="blue">No WorkedWith client with that email or mobile. Send them a quote and their record starts with your job.</Notice>}
      {result?.status === 'found' && <Card><ClientRecordView r={result.record} /></Card>}
    </PageShell>
  )
}
