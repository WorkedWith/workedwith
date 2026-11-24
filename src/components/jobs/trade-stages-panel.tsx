import type { createAdminClient } from '@/lib/supabase/admin'
import { loadStageDetails } from '@/lib/stages/details'
import { stageLabel, METHOD_LABEL, isPaidElsewhere } from '@/lib/payments/labels'
import { canRequestPaymentAnyway } from '@/lib/jobs/cancel'
import { sendApprovalReminder } from '@/actions/stages'
import { formatPence, penceToInput } from '@/lib/money'
import { Card, Pill } from '@/components/ui'
import { ActionButton } from './action-button'
import { PhotoStrip } from './photo-strip'
import { IssueThread } from './issue-thread'
import { MarkDoneForm, MarkPaidForm, RequestAnywayForm } from './stage-forms'
import { RefundButton } from './refund-button'
import type { JobBundle } from '@/lib/jobs/load'

type AdminClient = ReturnType<typeof createAdminClient>
const DUE = ['approved', 'requested_by_trade', 'part_paid', 'overdue']
const days = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : 0)

/** Stages with status, mark done with photos, issues, request payment anyway and payments (PRD 18). */
export async function TradeStagesPanel({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  const { stages, job } = bundle
  if (stages.length === 0) return null
  const d = await loadStageDetails(admin, job.id, stages.map(s => s.id))
  return (
    <Card>
      <h2 className="text-lg font-bold text-brand-navy">Stages and payments</h2>
      <ol className="mt-3 space-y-4">
        {stages.map(s => {
          const issues = d.issues.get(s.id) ?? []
          const openIssue = issues.find(i => i.status === 'open')
          const invoice = d.invoices.get(s.id)
          const payments = d.payments.get(s.id) ?? []
          const evidence = d.evidence.get(s.id) ?? []
          const balance = s.amount_pence - s.amount_paid_pence
          const requestable = canRequestPaymentAnyway(s, openIssue?.created_at ?? null)
          return (
            <li key={s.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-sm text-gray-600">{formatPence(s.amount_pence)}{s.amount_paid_pence > 0 ? `, ${formatPence(s.amount_paid_pence)} paid` : ''}{invoice ? ` · ${invoice.invoice_number}` : ''}</p>
                </div>
                <Pill tone={s.status === 'paid' ? 'green' : s.status === 'issue_raised' || s.status === 'overdue' ? 'red' : DUE.includes(s.status) ? 'amber' : 'grey'}>{stageLabel(s)}</Pill>
              </div>
              {s.status === 'awaiting_approval' && <p className="mt-1 text-sm text-gray-600">Waiting {days(s.marked_done_at)} {days(s.marked_done_at) === 1 ? 'day' : 'days'} for the client. Reminders go at day 5, 10 and 14.</p>}
              {s.client_says_paid_at && DUE.includes(s.status) && <p className="mt-1 text-sm text-blue-800">The client says they have paid. Chasing is paused for up to 3 working days.</p>}
              {s.request_note && <p className="mt-1 text-sm text-gray-600">Your request note: {s.request_note}</p>}
              {evidence.map(e => (
                <div key={e.id} className="mt-2">
                  {e.note && <p className="text-sm text-gray-700">{e.note}</p>}
                  <PhotoStrip paths={e.photo_paths} urls={d.photoUrl} />
                </div>
              ))}
              <IssueThread issues={issues} urls={d.photoUrl} viewerId={userId} canReply />
              {payments.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {payments.map(p => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{formatPence(p.amount_pence)} by {METHOD_LABEL[p.method]} on {new Date(p.paid_at).toLocaleDateString('en-GB')}
                        {isPaidElsewhere(p.method) && (p.client_confirmed_at ? ', confirmed by the client' : p.client_disputed_at ? ', the client says they did not pay this way' : ', waiting for the client to confirm')}
                        {p.refunded_pence > 0 && `, ${formatPence(p.refunded_pence)} refunded${p.refund_client_confirmed_at ? ' (client confirmed)' : ''}`}
                      </span>
                      {p.method !== 'card' && p.refunded_pence < p.amount_pence && <RefundButton paymentId={p.id} max={penceToInput(p.amount_pence - p.refunded_pence)} />}
                    </li>
                  ))}
                </ul>
              )}
              {job.status !== 'cancelled' && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {s.status === 'upcoming' && !s.is_deposit && job.status === 'in_progress' && <MarkDoneForm stageId={s.id} />}
                  {s.status === 'issue_raised' && <MarkDoneForm stageId={s.id} resubmit />}
                  {s.status === 'awaiting_approval' && <ActionButton variant="ghost" action={sendApprovalReminder.bind(null, s.id)} done="Reminder sent.">Send a reminder</ActionButton>}
                  {requestable && <RequestAnywayForm stageId={s.id} />}
                </div>
              )}
              {DUE.includes(s.status) && balance > 0 && <div className="mt-3"><MarkPaidForm stageId={s.id} balance={penceToInput(balance)} /></div>}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
