import type { createAdminClient } from '@/lib/supabase/admin'
import type { JobBundle } from '@/lib/jobs/load'
import { TradeStartPanel } from './trade-start-panel'
import { TradeStagesPanel } from './trade-stages-panel'
import { SuggestedMatches } from './suggested-matches'
import { CancelPanel } from './cancel-panel'
import { ChargebacksPanel } from './chargebacks-panel'
import { JobReviewPanel } from '@/components/reviews/job-review-panel'
import { ChasingPanel } from './chasing-panel'
import { VariationsPanel } from './variations-panel'
import { InvoicesPanel } from '@/components/invoices/invoices-panel'

type AdminClient = ReturnType<typeof createAdminClient>

/** Trade job page sections, in order (PRD 18 job page). Later phases add theirs here. */
export async function TradeJobSections({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  return (
    <>
      <JobReviewPanel admin={admin} bundle={bundle} userId={userId} role="trade" />
      <ChargebacksPanel admin={admin} jobId={bundle.job.id} />
      <SuggestedMatches admin={admin} tradeId={userId} jobId={bundle.job.id} />
      <TradeStartPanel admin={admin} bundle={bundle} userId={userId} />
      <TradeStagesPanel admin={admin} bundle={bundle} userId={userId} />
      <VariationsPanel admin={admin} bundle={bundle} role="trade" />
      <ChasingPanel admin={admin} bundle={bundle} />
      <InvoicesPanel admin={admin} jobId={bundle.job.id} role="trade" />
      <CancelPanel bundle={bundle} role="trade" />
    </>
  )
}
