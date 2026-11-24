import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { suggestInvoicePrefix } from '@/lib/business-details'
import { PageShell, PageTitle } from '@/components/ui'
import { BusinessForm } from './business-form'

export const metadata = { title: 'Business details | WorkedWith' }

export default async function BusinessDetailsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const { data: p } = await admin.from('trade_profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (!p) redirect('/onboarding/trade')
  const { data: u } = await admin.from('users').select('email, full_name, phone').eq('id', user.id).maybeSingle()

  const name = (p.company_name as string | null) ?? (u?.full_name as string | undefined) ?? ''
  return (
    <PageShell>
      <PageTitle title="Business details" sub="Shown on your quotes, invoices and public profile." back={{ href: '/profile', label: 'Profile' }} />
      <BusinessForm
        prefixLocked={(p.next_invoice_number ?? 1) > 1 && !!p.invoice_prefix}
        initial={{
          companyName: name,
          tradingAddress: p.trading_address ?? '',
          businessEmail: p.business_email ?? (u?.email as string | undefined) ?? '',
          businessPhone: p.business_phone ?? (u?.phone as string | undefined) ?? '',
          replyEmail: p.reply_email ?? '',
          vatNumber: p.vat_number ?? '',
          invoicePrefix: p.invoice_prefix ?? suggestInvoicePrefix(name),
          paymentTermsDays: p.payment_terms_days ?? 7,
          partPaymentsEnabled: p.part_payments_enabled ?? true,
          defaultDepositFor: p.default_deposit_for ?? 'materials',
          defaultDepositRefundable: p.default_deposit_refundable ?? true,
          defaultNonRefundableFrom: p.default_non_refundable_from === 'work_started' ? 'work_started' : 'materials_ordered',
          extraTerms: p.extra_terms ?? '',
        }}
      />
    </PageShell>
  )
}
