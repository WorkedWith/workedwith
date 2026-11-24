import type { createAdminClient } from '@/lib/supabase/admin'
import { decideSuggestedMatch } from '@/actions/stages'
import { formatPence } from '@/lib/money'
import { Card } from '@/components/ui'
import { ActionButton } from './action-button'

type AdminClient = ReturnType<typeof createAdminClient>

/** "£1,200 from S MILLER. Is this invoice BLC 0014?" (PRD 9). */
export async function SuggestedMatches({ admin, tradeId, jobId }: { admin: AdminClient; tradeId: string; jobId?: string }) {
  const { data } = await admin.from('bank_matches').select('id, amount_pence, payer_name, received_at, invoice_id').eq('trade_id', tradeId).eq('match_status', 'suggested').order('received_at', { ascending: false })
  if (!data || data.length === 0) return null
  const invIds = data.map(m => m.invoice_id).filter((x): x is string => !!x)
  const { data: invs } = await admin.from('invoices').select('id, invoice_number, job_id').in('id', invIds)
  const inv = new Map((invs ?? []).map(i => [i.id as string, i]))
  const rows = data.filter(m => !jobId || inv.get(m.invoice_id as string)?.job_id === jobId)
  if (rows.length === 0) return null
  return (
    <Card className="border-2 border-brand-amber">
      <h2 className="text-base font-bold text-brand-navy">Payments to confirm</h2>
      <ul className="mt-2 space-y-3">
        {rows.map(m => (
          <li key={m.id} className="rounded-xl bg-amber-50 p-3">
            <p className="text-sm text-gray-900">{formatPence(m.amount_pence)} from {m.payer_name ?? 'someone'} on {new Date(m.received_at).toLocaleDateString('en-GB')}. Is this invoice <strong>{inv.get(m.invoice_id as string)?.invoice_number}</strong>?</p>
            <div className="mt-2 flex gap-2">
              <ActionButton action={decideSuggestedMatch.bind(null, m.id, true)}>Yes, mark paid</ActionButton>
              <ActionButton variant="ghost" action={decideSuggestedMatch.bind(null, m.id, false)}>No</ActionButton>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
