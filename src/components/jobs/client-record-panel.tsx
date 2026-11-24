import type { createAdminClient } from '@/lib/supabase/admin'
import { computeClientRecord } from '@/lib/client-record/record'
import { tradeCanSeeAsQuotingTrade } from '@/lib/client-record/views'
import { ClientRecordView } from '@/components/client-record/client-record-view'
import { Card } from '@/components/ui'

type AdminClient = ReturnType<typeof createAdminClient>

/** The client's full record next to the quote (PRD 14). */
export async function ClientRecordPanel({ admin, clientUserId, tradeId }: { admin: AdminClient; clientUserId: string | null; tradeId: string }) {
  if (!clientUserId || !(await tradeCanSeeAsQuotingTrade(admin, tradeId, clientUserId))) return null
  const r = await computeClientRecord(admin, clientUserId)
  if (!r) return null
  return (
    <Card>
      <h2 className="mb-3 text-base font-bold text-brand-navy">Client record</h2>
      <ClientRecordView r={r} />
    </Card>
  )
}
