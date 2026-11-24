import type { createAdminClient } from '@/lib/supabase/admin'
import { markJobStarted, requestEarlyStartConsent } from '@/actions/job-events'
import { needsConsentToStartOn } from '@/lib/jobs/events'
import { plannedStartWording } from '@/lib/quotes/wording'
import { Card, Notice } from '@/components/ui'
import { ActionButton } from './action-button'
import { ConfirmStartButton, ProposeStartForm } from './start-date-forms'
import { MaterialsOrderedButton } from './materials-button'
import type { JobBundle } from '@/lib/jobs/load'

type AdminClient = ReturnType<typeof createAdminClient>
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

/** Start date, materials ordered and mark started (PRD 7, 18 job page). */
export async function TradeStartPanel({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  const { job, current } = bundle
  if (!current || current.status !== 'accepted' || job.status === 'cancelled') return null
  const { data: open } = await admin.from('start_date_proposals').select('*').eq('job_id', job.id).eq('status', 'proposed').order('created_at', { ascending: false }).limit(1).maybeSingle()
  const notStarted = !job.started_at
  const blockedByConsent = notStarted && needsConsentToStartOn(job, new Date())
  const coversMaterials = current.deposit_for === 'materials' || current.deposit_for === 'materials_and_labour'

  return (
    <Card>
      <h2 className="text-lg font-bold text-brand-navy">Start</h2>
      <p className="mt-1 text-sm text-gray-700">
        {job.started_at ? `Started ${fmt(job.started_at)}.` : job.agreed_start_date ? plannedStartWording('date', job.agreed_start_date) : plannedStartWording(current.planned_start_type, current.planned_start_date)}
      </p>
      {job.materials_ordered_at && <p className="mt-1 text-sm text-gray-600">Materials ordered {fmt(job.materials_ordered_at)}.</p>}

      {notStarted && open && open.proposed_by_user_id !== userId && (
        <div className="mt-3 space-y-2">
          <Notice tone="amber">The client suggested {fmt(open.proposed_date)}.</Notice>
          <ConfirmStartButton proposalId={open.id} needsConsent={false} />
        </div>
      )}
      {notStarted && open && open.proposed_by_user_id === userId && (
        <p className="mt-3 text-sm text-gray-600">Waiting for the client to confirm {fmt(open.proposed_date)}.</p>
      )}

      {notStarted && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-800">{job.agreed_start_date ? 'Change the planned start' : 'Propose a planned start'}</p>
            <ProposeStartForm jobId={job.id} label="Send to the client" askConsentBefore={null} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {coversMaterials && !job.materials_ordered_at && job.status === 'booked' && <MaterialsOrderedButton jobId={job.id} />}
            {job.status === 'booked' && !blockedByConsent && <ActionButton action={markJobStarted.bind(null, job.id)} confirm="Mark the job as started today?">Mark job started</ActionButton>}
          </div>
          {job.status === 'quoted' && current.deposit_required && <p className="text-sm text-gray-600">You can mark the job started once the deposit is paid.</p>}
          {job.status === 'booked' && blockedByConsent && (
            <div className="space-y-2">
              <Notice tone="blue">
                The client is inside their 14 day cancellation period until {fmt(job.cancellation_period_ends_at ?? '')} and hasn’t asked for an early start. If you start without it, you may not be able to charge for work done.
              </Notice>
              <ActionButton variant="outline" action={requestEarlyStartConsent.bind(null, job.id)} done="Request sent to the client.">
                {job.early_start_requested_at ? 'Send the request again' : 'Ask the client for an early start'}
              </ActionButton>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
