import type { createAdminClient } from '@/lib/supabase/admin'
import type { JobBundle } from '@/lib/jobs/load'
import { ClientStartPanel } from './client-start-panel'

type AdminClient = ReturnType<typeof createAdminClient>

/** Client job page sections, in order (PRD 18 client job page). Later phases add theirs here. */
export async function ClientJobSections({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  return (
    <>
      <ClientStartPanel admin={admin} bundle={bundle} userId={userId} />
    </>
  )
}
