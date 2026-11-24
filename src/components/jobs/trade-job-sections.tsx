import type { createAdminClient } from '@/lib/supabase/admin'
import type { JobBundle } from '@/lib/jobs/load'
import { TradeStartPanel } from './trade-start-panel'
import { TradeStagesPanel } from './trade-stages-panel'
import { SuggestedMatches } from './suggested-matches'
import { CancelPanel } from './cancel-panel'

type AdminClient = ReturnType<typeof createAdminClient>

/** Trade job page sections, in order (PRD 18 job page). Later phases add theirs here. */
export async function TradeJobSections({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  return (
    <>
      <SuggestedMatches admin={admin} tradeId={userId} jobId={bundle.job.id} />
      <TradeStartPanel admin={admin} bundle={bundle} userId={userId} />
      <TradeStagesPanel admin={admin} bundle={bundle} userId={userId} />
      <CancelPanel bundle={bundle} role="trade" />
    </>
  )
}
