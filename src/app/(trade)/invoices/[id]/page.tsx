import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadInvoiceDoc } from '@/lib/invoices/document'
import { InvoiceView } from '@/components/invoices/invoice-view'
import { PageShell } from '@/components/ui'

export const metadata = { title: 'Invoice | WorkedWith' }

export default async function TradeInvoicePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const d = await loadInvoiceDoc(admin, params.id)
  if (!d || d.invoice.trade_id !== user.id) notFound()
  return (
    <PageShell>
      <a href={`/jobs/${d.invoice.job_id}`} className="inline-flex min-h-[44px] items-center text-sm text-gray-500">‹ Job</a>
      <InvoiceView d={d} showPay={false} />
    </PageShell>
  )
}
