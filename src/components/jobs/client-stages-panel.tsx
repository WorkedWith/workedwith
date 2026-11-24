import type { createAdminClient } from '@/lib/supabase/admin'
import { loadStageDetails } from '@/lib/stages/details'
import { stageLabel, METHOD_LABEL, isPaidElsewhere } from '@/lib/payments/labels'
import { approveStage, clientConfirmPayment, clientSaysPaid } from '@/actions/stages'
import { getPayeeDetails } from '@/lib/getting-paid/bank-account'
import { formatSortCode } from '@/lib/getting-paid/bank-format'
import { formatPence, formatPenceExact } from '@/lib/money'
import { CopyRow } from '@/components/copy-button'
import { Card, Notice, Pill } from '@/components/ui'
import { ActionButton } from './action-button'
import { PhotoStrip } from './photo-strip'
import { IssueThread } from './issue-thread'
import { RaiseIssueForm } from './stage-forms'
import { ClientPayExtras } from './client-pay-extras'
import type { JobBundle } from '@/lib/jobs/load'

type AdminClient = ReturnType<typeof createAdminClient>
const DUE = ['approved', 'requested_by_trade', 'part_paid', 'overdue']

/** The client's stage timeline: approve or raise an issue, then pay (PRD 5, 18). Phone first. */
export async function ClientStagesPanel({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  const { stages, job } = bundle
  if (stages.length === 0 || !job.trade_user_id) return null
  const d = await loadStageDetails(admin, job.id, stages.map(s => s.id))
  const payee = await getPayeeDetails(admin, job.trade_user_id)
  const { data: tp } = await admin.from('trade_profiles').select('part_payments_enabled').eq('user_id', job.trade_user_id).maybeSingle()
  const partOk = (tp?.part_payments_enabled as boolean | null) ?? true
  const toApprove = stages.filter(s => s.status === 'awaiting_approval' || (s.status === 'requested_by_trade' && !s.approved_at))
  const due = stages.filter(s => DUE.includes(s.status) && s.amount_pence > s.amount_paid_pence)
  const toConfirm = Array.from(d.payments.values()).flat().filter(p => (isPaidElsewhere(p.method) && !p.client_confirmed_at && !p.client_disputed_at) || (p.refund_marked_at && !p.refund_client_confirmed_at && !p.client_disputed_at))

  return (
    <>
      {toConfirm.map(p => {
        const refund = !!p.refund_marked_at && !p.refund_client_confirmed_at
        return (
          <Card key={p.id}>
            <p className="text-base font-semibold text-brand-navy">{refund ? `Did you receive a refund of ${formatPence(p.refunded_pence)}?` : `Did you pay ${formatPence(p.amount_pence)} by ${METHOD_LABEL[p.method]}?`}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <ActionButton action={clientConfirmPayment.bind(null, p.id, refund ? 'refund' : 'paid_elsewhere', true)}>Yes, confirm</ActionButton>
              <ActionButton variant="outline" action={clientConfirmPayment.bind(null, p.id, refund ? 'refund' : 'paid_elsewhere', false)}>{refund ? 'Not received' : 'No, I didn’t'}</ActionButton>
            </div>
          </Card>
        )
      })}

      {toApprove.map(s => (
        <Card key={s.id} className="border-2 border-brand-amber">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{s.status === 'requested_by_trade' ? 'Payment requested by the trade. Not approved by you' : 'Please check this stage'}</p>
          <h2 className="mt-1 text-lg font-bold text-brand-navy">{s.name}: {formatPence(s.amount_pence)}</h2>
          {(d.evidence.get(s.id) ?? []).slice(-1).map(e => (
            <div key={e.id}>{e.note && <p className="mt-2 text-sm text-gray-700">{e.note}</p>}<PhotoStrip paths={e.photo_paths} urls={d.photoUrl} /></div>
          ))}
          {s.request_note && <p className="mt-2 text-sm text-gray-700">The trade says: {s.request_note}</p>}
          <IssueThread issues={d.issues.get(s.id) ?? []} urls={d.photoUrl} viewerId={userId} canReply />
          <div className="mt-4 flex flex-col gap-2">
            <ActionButton full action={approveStage.bind(null, s.id)}>Approve {s.name}</ActionButton>
            {s.status === 'awaiting_approval' && <RaiseIssueForm stageId={s.id} />}
          </div>
          <p className="mt-2 text-xs text-gray-500">Approving makes this stage due within the trade’s payment terms. Nothing is approved unless you approve it.</p>
        </Card>
      ))}

      {due.map(s => {
        const inv = d.invoices.get(s.id)
        const balance = s.amount_pence - s.amount_paid_pence
        return (
          <Card key={s.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.is_deposit ? 'Deposit to pay' : 'To pay'}{inv ? ` · due ${new Date(inv.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` : ''}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-brand-navy">{formatPenceExact(balance)}</p>
            <p className="text-sm text-gray-600">{s.name}{s.status === 'requested_by_trade' || (s.requested_by_trade_at && !s.approved_at) ? '. Payment requested by the trade. Not approved by you' : ''}</p>
            {s.client_says_paid_at ? (
              <div className="mt-3"><Notice tone="blue">Thanks. You told the trade you have paid. It shows as paid once the money arrives.</Notice></div>
            ) : (
              <>
                <div className="mt-3 divide-y divide-gray-100 rounded-xl bg-gray-50 px-4">
                  {payee ? (
                    <>
                      <CopyRow label="Account name" value={payee.accountName} />
                      <CopyRow label="Sort code" value={payee.sortCode} display={formatSortCode(payee.sortCode)} />
                      <CopyRow label="Account number" value={payee.accountNumber} />
                    </>
                  ) : <p className="py-3 text-sm text-gray-600">Ask the trade for their bank details.</p>}
                  {inv && <CopyRow label="Reference (please use this)" value={inv.invoice_number} />}
                  <CopyRow label="Amount" value={(balance / 100).toFixed(2)} display={formatPenceExact(balance)} />
                </div>
                <p className="mt-2 text-xs text-gray-500">Pay by bank transfer straight to the trade. No fees to anyone.{partOk ? ' You can pay in parts of £10 or more.' : ''}</p>
                <ClientPayExtras admin={admin} stageId={s.id} tradeUserId={job.trade_user_id as string} balancePence={balance} />
                <div className="mt-3"><ActionButton variant="outline" full action={clientSaysPaid.bind(null, s.id)} done="Thanks, the trade has been told.">I’ve paid</ActionButton></div>
              </>
            )}
            {inv && <a href={`/my/invoices/${inv.id}`} className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-navy underline">See invoice {inv.invoice_number}</a>}
          </Card>
        )
      })}

      <Card>
        <h2 className="text-base font-bold text-brand-navy">Stages</h2>
        <ol className="mt-2 divide-y divide-gray-100">
          {stages.map(s => (
            <li key={s.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-sm tabular-nums">{formatPence(s.amount_pence)}</span>
              </div>
              <div className="mt-1"><Pill tone={s.status === 'paid' ? 'green' : DUE.includes(s.status) ? 'amber' : 'grey'}>{stageLabel(s)}</Pill></div>
              {!toApprove.includes(s) && (d.evidence.get(s.id) ?? []).map(e => <PhotoStrip key={e.id} paths={e.photo_paths} urls={d.photoUrl} />)}
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}
