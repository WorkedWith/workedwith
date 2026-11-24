import type { createAdminClient } from '@/lib/supabase/admin'
import { withdrawQuote, extendDepositDeadline } from '@/actions/quotes'
import { loadQuote } from '@/lib/quotes/service'
import { signedPhotoUrls } from '@/lib/photos'
import { QUOTE_STATUS_LABEL } from '@/lib/jobs/status'
import { formatPence } from '@/lib/money'
import { QuoteDocument } from '@/components/quotes/quote-document'
import { Card, LinkButton, Notice, Pill } from '@/components/ui'
import { ActionButton } from './action-button'
import type { JobBundle } from '@/lib/jobs/load'

type AdminClient = ReturnType<typeof createAdminClient>

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
}

export async function TradeQuotePanel({ admin, bundle, businessName }: { admin: AdminClient; bundle: JobBundle; businessName: string }) {
  const q = bundle.current
  if (!q) return null
  const full = await loadQuote(admin, q.id)
  if (!full) return null
  const photos = await signedPhotoUrls(admin, q.photo_paths)
  const { data: changes } = await admin.from('quote_change_requests').select('id, note, created_at, quote_id').in('quote_id', bundle.quotes.map(x => x.id)).order('created_at', { ascending: false })
  const depositStage = bundle.stages.find(s => s.is_deposit)
  const depositOutstanding = q.status === 'accepted' && q.deposit_required && depositStage && depositStage.status !== 'paid'
  const canEdit = bundle.job.status === 'quoted' && q.status !== 'accepted'

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-brand-navy">Quote{q.version > 1 ? `, version ${q.version}` : ''}</h2>
        <Pill tone={q.status === 'accepted' ? 'green' : q.status === 'declined' || q.status === 'expired' ? 'red' : 'blue'}>{QUOTE_STATUS_LABEL[q.status]}</Pill>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {q.sent_at && `Sent ${fmt(q.sent_at)}. `}{q.viewed_at && `Opened ${fmt(q.viewed_at)}. `}{q.accepted_at && `Accepted ${fmt(q.accepted_at)} by the client in their account.`}
      </p>

      {q.status === 'declined' && q.declined_reason && <div className="mt-3"><Notice tone="red">Their reason: {q.declined_reason}</Notice></div>}
      {(changes ?? []).filter(c => c.quote_id === q.id).map(c => (
        <div key={c.id} className="mt-3"><Notice tone="amber"><strong>They asked:</strong> {c.note}</Notice></div>
      ))}
      {depositOutstanding && (
        <div className="mt-3">
          <Notice tone="amber">
            Deposit of {formatPence(q.deposit_amount_pence)} not paid yet. {q.deposit_due_by ? `The quote expires on ${new Date(q.deposit_due_by).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} if it is not paid.` : ''}
          </Notice>
        </div>
      )}

      <div className="mt-4">
        <QuoteDocument q={{
          businessName, title: q.title, description: q.description, clientName: q.client_name, clientCompany: q.client_company_name,
          jobAddress: q.job_address, lines: full.lines.map(l => ({ description: l.description, pricePence: l.price_pence })),
          vatApplies: q.vat_applies, netPence: q.net_pence, vatPence: q.vat_pence, totalPence: q.total_pence,
          deposit: { required: q.deposit_required, amountPence: q.deposit_amount_pence, for: q.deposit_for, refundable: q.deposit_refundable, nonRefundableFrom: q.deposit_non_refundable_from },
          stages: q.payment_timing === 'on_completion' ? [{ name: 'Balance on completion', amountPence: q.total_pence - q.deposit_amount_pence }] : full.stages.map(s => ({ name: s.name, amountPence: s.amount_pence })),
          plannedStart: { type: q.planned_start_type, date: q.planned_start_date }, validUntil: q.valid_until,
          clientKind: q.client_type_at_acceptance ?? q.client_type, version: q.version, photos,
        }} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canEdit && <LinkButton href={`/quotes/${q.id}/edit`} variant={q.status === 'changes_requested' || q.status === 'draft' ? 'primary' : 'outline'}>{q.status === 'draft' ? 'Finish and send' : 'Edit and resend'}</LinkButton>}
        {['sent', 'viewed', 'changes_requested'].includes(q.status) && <ActionButton variant="danger" confirm="Withdraw this quote? The client will no longer be able to accept it." action={withdrawQuote.bind(null, q.id)}>Withdraw quote</ActionButton>}
        {(depositOutstanding || (q.status === 'expired' && q.deposit_required && q.accepted_at)) && <ActionButton variant="outline" action={extendDepositDeadline.bind(null, q.id)}>Give 7 more days for the deposit</ActionButton>}
        <LinkButton href={`/quotes/new?copy=${q.id}`} variant="ghost">Copy to a new quote</LinkButton>
      </div>

      {bundle.quotes.length > 1 && (
        <details className="mt-4">
          <summary className="min-h-[40px] cursor-pointer text-sm font-semibold text-brand-navy">Earlier versions ({bundle.quotes.length - 1})</summary>
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {bundle.quotes.filter(x => x.id !== q.id).map(x => (
              <li key={x.id} className="flex justify-between py-2"><span>Version {x.version}: {QUOTE_STATUS_LABEL[x.status]}</span><span className="tabular-nums">{formatPence(x.total_pence)}</span></li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}
