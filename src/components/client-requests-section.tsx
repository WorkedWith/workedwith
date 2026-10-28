import { createAdminClient } from '@/lib/supabase/admin'
import { jobLabel } from '@/lib/trade-types'
import { RemindTradeButton } from './remind-trade-button'
import type { PendingInvite } from '@/types/database'

const MAX_REMINDERS = 2

/** Client dashboard: requests sent to trades, whether they are waiting, and what to do next. */
export async function ClientRequestsSection({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data } = await admin
    .from('pending_invites')
    .select('*')
    .eq('inviting_client_id', userId)
    .eq('source', 'client_invite')
    .or(`status.eq.sent,and(status.eq.declined,declined_at.gte.${since})`)
    .order('created_at', { ascending: false })
    .limit(10)
  const rows = (data ?? []) as unknown as PendingInvite[]
  const open = rows.filter(r => r.status === 'sent' && new Date(r.expires_at) > new Date())
  const declined = rows.filter(r => r.status === 'declined' && !r.overturned_at)
  if (open.length === 0 && declined.length === 0) return null

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-brand-navy">Your requests to trades</h2>
      <ul className="mt-3 divide-y divide-gray-100">
        {open.map(r => {
          const days = Math.max(1, Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 86_400_000))
          const canRemind = !r.listing_submission_id && r.reminder_count < MAX_REMINDERS
          return (
            <li key={r.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-gray-800">{r.trade_name}: {jobLabel(r.job_type)}</p>
              <p className="text-xs text-gray-500">Waiting for them to answer. Closes in {days} day{days === 1 ? '' : 's'}.</p>
              {canRemind && <RemindTradeButton inviteId={r.id} sent={r.reminder_count} />}
            </li>
          )
        })}
        {declined.map(r => (
          <li key={r.id} className="py-3 first:pt-0 last:pb-0">
            <p className="text-sm font-semibold text-gray-800">{r.trade_name}: {jobLabel(r.job_type)}</p>
            <p className="text-xs text-gray-500">
              {r.decline_reason === 'not_me'
                ? 'They said it was not them.'
                : 'They said they would not confirm this job.'}{' '}
              If the job did happen, you can send proof from the box above.
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
