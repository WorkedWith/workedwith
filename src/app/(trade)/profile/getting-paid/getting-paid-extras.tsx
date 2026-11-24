import { createAdminClient } from '@/lib/supabase/admin'
import { accountingMode, PLATFORM_LABEL } from '@/lib/accounting'
import { Card } from '@/components/ui'
import { AccountingCard } from './accounting-card'
import { CardsSection } from './cards-section'
import type { AccountingConnection } from '@/types/v42'

const WHAT: Record<string, string> = { contact: 'Contact', invoice: 'Invoice', payment: 'Payment', credit_note: 'Credit note', refund: 'Refund' }

/** Accounting software (phase 11) and optional cards (phase 13) on Getting paid. */
export async function GettingPaidExtras({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const { data } = await admin.from('accounting_connections').select('*').eq('trade_id', userId).maybeSingle()
  const conn = data as AccountingConnection | null
  const { data: items } = conn ? await admin.from('accounting_sync_items').select('id, status, entity_type, last_error').eq('connection_id', conn.id) : { data: [] }
  const list = items ?? []
  return (
    <>
      <Card>
        <h2 className="text-lg font-bold text-brand-navy">Accounting software</h2>
        <p className="mt-1 text-sm text-gray-600">Optional. Invoices and payments go straight to your software. You can always download a CSV from Exports.</p>
        <div className="mt-4">
          <AccountingCard
            mock={accountingMode() === 'mock'}
            connection={conn ? { platform: conn.platform, label: PLATFORM_LABEL[conn.platform], orgName: conn.external_org_name, status: conn.status } : null}
            counts={{ pending: list.filter(i => i.status === 'pending').length, synced: list.filter(i => i.status === 'synced').length, failed: list.filter(i => i.status === 'failed').length }}
            failures={list.filter(i => i.status === 'failed').slice(0, 10).map(i => ({ id: i.id as string, what: WHAT[i.entity_type as string] ?? 'Record', error: (i.last_error as string | null) ?? null }))}
          />
        </div>
      </Card>
      <CardsSection userId={userId} />
    </>
  )
}
