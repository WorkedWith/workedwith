import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildLbaData } from '@/lib/legal/lba'
import { claimPackAvailable } from '@/lib/legal/claim-pack'
import { formatPence } from '@/lib/money'
import { Card, Notice, PageShell, PageTitle } from '@/components/ui'
import { SendLetter } from './send-letter'

export const metadata = { title: 'Letter before action | WorkedWith' }

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default async function LetterPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const { data: job } = await admin.from('jobs').select('id, trade_user_id, title').eq('id', params.id).maybeSingle()
  if (!job || job.trade_user_id !== user.id) notFound()
  const d = await buildLbaData(admin, job.id, { includeInterest: false })
  const { data: sent } = await admin.from('legal_documents').select('id, sent_at, response_due_at, version').eq('job_id', job.id).eq('type', 'letter_before_action').not('sent_at', 'is', null).order('sent_at', { ascending: false })
  const pack = await claimPackAvailable(admin, job.id)

  return (
    <PageShell>
      <PageTitle title="Letter before action" sub={job.title ?? undefined} back={{ href: `/jobs/${job.id}`, label: 'Job' }} />
      <Notice tone="blue">
        Made from the job record, previewed by you and sent by you. WorkedWith does not collect debts, file claims or act for you.
      </Notice>
      {d ? (
        <Card>
          <p className="text-sm text-gray-700">
            {d.version === 'person'
              ? 'Your client is a person, so the letter follows the Pre Action Protocol for Debt Claims: they get 30 days to respond, with an information sheet and reply form.'
              : 'Your client is a company, so the letter allows 14 days. You can add statutory interest and fixed compensation.'}
          </p>
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {d.lines.map(l => <li key={l.invoiceNumber} className="flex justify-between py-2"><span>{l.invoiceNumber}, due {date(l.dueAt)}</span><span className="tabular-nums">{formatPence(l.balancePence)}</span></li>)}
          </ul>
          <p className="mt-2 text-sm font-semibold">Owed: {formatPence(d.principalPence)}</p>
          <div className="mt-4"><SendLetter jobId={job.id} company={d.version === 'company'} /></div>
        </Card>
      ) : (
        <Card><p className="text-sm text-gray-700">A letter can be sent once an invoice on this job is 21 days overdue. Deposits never go to a letter, because no work has been done.</p></Card>
      )}
      {(sent ?? []).length > 0 && (
        <Card>
          <h2 className="text-base font-bold text-brand-navy">Letters sent</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(sent ?? []).map(s => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>Sent {date(s.sent_at as string)}, response due {date(s.response_due_at as string)}</span>
                <a href={`/api/legal/doc/${s.id}`} className="min-h-[40px] font-semibold text-brand-navy underline">Download to post</a>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <h2 className="text-base font-bold text-brand-navy">Claim pack</h2>
        {pack ? (
          <>
            <p className="mt-1 text-sm text-gray-700">The full job record for a small claim, with the figures Money Claim Online asks for. You file the claim yourself.</p>
            <a href={`/api/legal/claim-pack/${job.id}`} className="mt-3 inline-flex min-h-[48px] items-center rounded-xl bg-brand-navy px-5 text-sm font-semibold text-white">Download the claim pack</a>
          </>
        ) : <p className="mt-1 text-sm text-gray-600">Available once the response period on a letter before action has passed.</p>}
      </Card>
    </PageShell>
  )
}
