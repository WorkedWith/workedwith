import type { createAdminClient } from '@/lib/supabase/admin'
import { formatPence } from '@/lib/money'
import { Card, Pill } from '@/components/ui'
import { SyncStatus } from './sync-status'

type AdminClient = ReturnType<typeof createAdminClient>

/** Invoices and credit notes on a job, with accounting sync status for the trade (PRD 18). */
export async function InvoicesPanel({ admin, jobId, role }: { admin: AdminClient; jobId: string; role: 'trade' | 'client' }) {
  const [{ data: invs }, { data: cns }] = await Promise.all([
    admin.from('invoices').select('id, invoice_number, total_pence, status, issued_at, approval_basis, trade_id').eq('job_id', jobId).order('sequence'),
    admin.from('credit_notes').select('id, credit_note_number, amount_pence, issued_at, reason').eq('job_id', jobId).order('sequence'),
  ])
  if (!invs?.length && !cns?.length) return null
  const base = role === 'trade' ? '/invoices' : '/my/invoices'
  return (
    <Card>
      <h2 className="text-base font-bold text-brand-navy">Invoices{cns?.length ? ' and credit notes' : ''}</h2>
      <ul className="mt-2 divide-y divide-gray-100">
        {(invs ?? []).map(i => (
          <li key={i.id as string} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <a href={`${base}/${i.id}`} className="min-h-[40px] text-sm font-semibold text-brand-navy underline">{i.invoice_number as string}{i.approval_basis === 'deposit' ? ' (deposit)' : ''}</a>
            <span className="flex items-center gap-2 text-sm">
              {role === 'trade' && <SyncStatus admin={admin} entityType="invoice" entityId={i.id as string} />}
              <Pill tone={i.status === 'paid' ? 'green' : i.status === 'credited' ? 'grey' : 'amber'}>{i.status === 'part_paid' ? 'Part paid' : i.status === 'issued' ? 'Unpaid' : i.status === 'paid' ? 'Paid' : 'Credited'}</Pill>
              <span className="tabular-nums">{formatPence(i.total_pence as number)}</span>
            </span>
          </li>
        ))}
        {(cns ?? []).map(c => (
          <li key={c.id as string} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <a href={`/api/credit-notes/${c.id}/pdf`} className="min-h-[40px] text-sm font-semibold text-brand-navy underline">{c.credit_note_number as string}</a>
            <span className="text-sm tabular-nums">minus {formatPence(c.amount_pence as number)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
