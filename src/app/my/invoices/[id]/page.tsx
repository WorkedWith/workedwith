import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadInvoiceDoc } from '@/lib/invoices/document'
import { InvoiceView } from '@/components/invoices/invoice-view'

export const metadata = { title: 'Invoice | WorkedWith', robots: { index: false } }

/** The client's invoice, opened from a text or email. Phone first, with copy buttons. */
export default async function ClientInvoicePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in/code?next=/my/invoices/${params.id}`)
  const admin = createAdminClient()
  const d = await loadInvoiceDoc(admin, params.id)
  if (!d) notFound()
  const { data: job } = await admin.from('jobs').select('client_user_id').eq('id', d.invoice.job_id).maybeSingle()
  if (job?.client_user_id !== user.id) notFound()
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-28 pt-5">
      <a href={`/my/jobs/${d.invoice.job_id}`} className="inline-flex min-h-[44px] items-center text-sm text-gray-500">‹ Your job</a>
      <InvoiceView d={d} showPay />
    </main>
  )
}
