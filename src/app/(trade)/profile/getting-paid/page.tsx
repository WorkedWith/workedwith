import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBankAccountSummary } from '@/lib/getting-paid/bank-account'
import { formatSortCode } from '@/lib/getting-paid/bank-format'
import { isMockOpenBanking } from '@/lib/open-banking'
import { Card, Notice, PageShell, PageTitle, Row } from '@/components/ui'
import { BankDetailsForm } from './bank-details-form'
import { ConnectionCard } from './connection-card'
import { GettingPaidExtras } from './getting-paid-extras'
import { SimulateTransfer } from './simulate-transfer'

export const metadata = { title: 'Getting paid | WorkedWith' }

const RETURN_MESSAGES: Record<string, { tone: 'green' | 'amber' | 'red'; text: string }> = {
  connected: { tone: 'green', text: 'Your bank is connected. Invoices will mark themselves paid when the money arrives.' },
  cancelled: { tone: 'amber', text: 'You did not finish connecting your bank. You can try again any time.' },
  expired: { tone: 'amber', text: 'That link has expired. Please try again.' },
  failed: { tone: 'red', text: 'We could not connect your bank. Please try again, or mark payments yourself.' },
  wrong_account: { tone: 'red', text: 'That bank account is not the one on your invoices. Connect the account clients pay into.' },
}

export default async function GettingPaidPage({ searchParams }: { searchParams: { bank?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const { data: tp } = await admin.from('trade_profiles').select('id').eq('user_id', user.id).maybeSingle()
  if (!tp) redirect('/onboarding/trade')

  const bank = await getBankAccountSummary(admin, user.id)
  const message = searchParams.bank ? RETURN_MESSAGES[searchParams.bank] : undefined

  return (
    <PageShell>
      <PageTitle title="Getting paid" sub="Where clients pay you, and how invoices mark themselves paid." back={{ href: '/profile', label: 'Profile' }} />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card>
        <h2 className="text-lg font-bold text-brand-navy">Bank details</h2>
        <p className="mt-1 text-sm text-gray-600">The account clients pay by bank transfer. Needed before your first quote.</p>
        {bank && (
          <div className="mt-3 divide-y divide-gray-100 rounded-xl bg-gray-50 px-4">
            <Row label="Account name" value={bank.accountName} />
            <Row label="Sort code" value={formatSortCode(bank.sortCode)} />
            <Row label="Account number" value={`Ending ${bank.accountNumberLast4}`} />
          </div>
        )}
        <div className="mt-4">
          <BankDetailsForm initial={bank ? { accountName: bank.accountName, sortCode: formatSortCode(bank.sortCode), last4: bank.accountNumberLast4 } : null} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-brand-navy">Connect your bank</h2>
        <p className="mt-1 text-sm text-gray-600">Optional, recommended. Connect the same account so WorkedWith can see incoming bank transfers.</p>
        <div className="mt-4">
          <ConnectionCard
            hasBankDetails={!!bank}
            status={bank?.connectionStatus ?? 'not_connected'}
            bankName={bank?.bankName ?? null}
            consentExpiresAt={bank?.consentExpiresAt ?? null}
          />
        </div>
        {isMockOpenBanking() && <p className="mt-4 text-xs text-gray-400">Test mode: banks are simulated.</p>}
      </Card>

      <GettingPaidExtras userId={user.id} />
      {isMockOpenBanking() && bank && <SimulateTransfer />}
    </PageShell>
  )
}
