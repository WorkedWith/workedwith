import type { createAdminClient } from '@/lib/supabase/admin'
import { giveEarlyStartConsent } from '@/actions/job-events'
import { needsConsentToStartOn } from '@/lib/jobs/events'
import { EARLY_START_CONSENT, plannedStartWording } from '@/lib/quotes/wording'
import { Card, Notice } from '@/components/ui'
import { ActionButton } from './action-button'
import { ConfirmStartButton, ProposeStartForm } from './start-date-forms'
import type { JobBundle } from '@/lib/jobs/load'

type AdminClient = ReturnType<typeof createAdminClient>
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export async function ClientStartPanel({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  const { job, current } = bundle
  if (!current || current.status !== 'accepted' || job.started_at || job.status === 'cancelled') return null
  const { data: open } = await admin.from('start_date_proposals').select('*').eq('job_id', job.id).eq('status', 'proposed').order('created_at', { ascending: false }).limit(1).maybeSingle()
  const consentAsked = !!job.early_start_requested_at && !job.early_start_consent_at && needsConsentToStartOn(job, new Date())

  return (
    <Card>
      <h2 className="text-lg font-bold text-brand-navy">Planned start</h2>
      <p className="mt-1 text-base text-gray-800">{job.agreed_start_date ? plannedStartWording('date', job.agreed_start_date) : plannedStartWording(current.planned_start_type, current.planned_start_date)}</p>
      {job.materials_ordered_at && <p className="mt-1 text-sm text-gray-600">Your materials were ordered on {fmt(job.materials_ordered_at)}.</p>}

      {open && open.proposed_by_user_id !== userId && (
        <div className="mt-4 space-y-3">
          <Notice tone="amber">The trade suggests a planned start of <strong>{fmt(open.proposed_date)}</strong>.</Notice>
          <ConfirmStartButton proposalId={open.id} needsConsent={needsConsentToStartOn(job, new Date(open.proposed_date))} />
          <details>
            <summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-brand-navy">Suggest another date</summary>
            <div className="mt-2"><ProposeStartForm jobId={job.id} label="Suggest this date" askConsentBefore={job.client_type_at_acceptance === 'person' && !job.early_start_consent_at ? job.cancellation_period_ends_at : null} /></div>
          </details>
        </div>
      )}
      {open && open.proposed_by_user_id === userId && <p className="mt-3 text-sm text-gray-600">You suggested {fmt(open.proposed_date)}. Waiting for the trade.</p>}

      {consentAsked && (
        <div className="mt-4 space-y-3">
          <Notice tone="blue">The trade would like to start within your 14 day cancellation period.</Notice>
          <p className="text-sm text-gray-700">{EARLY_START_CONSENT}</p>
          <ActionButton full action={giveEarlyStartConsent.bind(null, job.id)}>Yes, I’m happy for the work to start early</ActionButton>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">Start dates are planned, not guaranteed.</p>
    </Card>
  )
}
