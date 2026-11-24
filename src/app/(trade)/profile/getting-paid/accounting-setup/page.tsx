import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLATFORM_LABEL } from '@/lib/accounting'
import { Card, PageShell, PageTitle } from '@/components/ui'
import { AccountingSetupForm } from './setup-form'
import type { AccountingConnection } from '@/types/v42'

export const metadata = { title: 'Accounting set up | WorkedWith' }

export default async function AccountingSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const { data } = await admin.from('accounting_connections').select('*').eq('trade_id', user.id).maybeSingle()
  const conn = data as AccountingConnection | null
  if (!conn?.setup_options) redirect('/profile/getting-paid')
  const { data: tp } = await admin.from('trade_profiles').select('vat_number').eq('user_id', user.id).maybeSingle()
  const o = conn.setup_options
  return (
    <PageShell>
      <PageTitle title={`Set up ${PLATFORM_LABEL[conn.platform]}`} sub={conn.external_org_name ?? undefined} back={{ href: '/profile/getting-paid', label: 'Getting paid' }} />
      <Card>
        <AccountingSetupForm sales={o.sales} bank={o.bank} defaultSales={conn.sales_account_code ?? o.defaultSales} defaultBank={conn.payment_account_id ?? o.defaultBank} vatRegistered={!!tp?.vat_number} />
      </Card>
    </PageShell>
  )
}
