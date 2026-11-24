import type { createAdminClient } from '@/lib/supabase/admin'
import type { JobBundle } from '@/lib/jobs/load'
import { TradeStartPanel } from './trade-start-panel'

type AdminClient = ReturnType<typeof createAdminClient>

/** Trade job page sections, in order (PRD 18 job page). Later phases add theirs here. */
export async function TradeJobSections({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  return (
    <>
      <TradeStartPanel admin={admin} bundle={bundle} userId={userId} />
    </>
  )
}
