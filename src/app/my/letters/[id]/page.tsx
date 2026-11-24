import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPence } from '@/lib/money'
import type { LbaData } from '@/lib/legal/lba'

export const metadata = { title: 'Letter before action | WorkedWith', robots: { index: false } }

export default async function ClientLetterPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in/code?next=/my/letters/${params.id}`)
  const admin = createAdminClient()
  const { data: doc } = await admin.from('legal_documents').select('*').eq('id', params.id).eq('type', 'letter_before_action').maybeSingle()
  if (!doc?.sent_at) notFound()
  const { data: job } = await admin.from('jobs').select('id, client_user_id').eq('id', doc.job_id).maybeSingle()
  if (job?.client_user_id !== user.id) notFound()
  const d = doc.data as unknown as LbaData
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-28 pt-5">
      <h1 className="text-2xl font-bold text-brand-navy">Letter before action</h1>
      <p className="text-gray-700">From {d.trade.name}, about {d.jobTitle}. Total owed: <strong>{formatPence(d.totalPence)}</strong>.</p>
      <p className="text-gray-700">Please respond by <strong>{new Date(d.respondBy).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
      <a href={`/api/legal/doc/${doc.id}`} className="flex min-h-[52px] items-center justify-center rounded-xl bg-brand-navy text-base font-semibold text-white">Read the letter (PDF)</a>
      <a href={`/my/jobs/${job.id}`} className="flex min-h-[52px] items-center justify-center rounded-xl border-2 border-brand-navy text-base font-semibold text-brand-navy">Pay from your job page</a>
      <p className="text-xs text-gray-500">Free, independent debt advice is available from Citizens Advice, StepChange and National Debtline.</p>
    </main>
  )
}
