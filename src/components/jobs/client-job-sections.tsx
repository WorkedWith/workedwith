import type { createAdminClient } from '@/lib/supabase/admin'
import type { JobBundle } from '@/lib/jobs/load'

type AdminClient = ReturnType<typeof createAdminClient>

/** Client job page sections added by later phases (start date, stages, paying, variations, review). */
export async function ClientJobSections({ admin, bundle }: { admin: AdminClient; bundle: JobBundle }) {
  void admin
  void bundle
  return null
}
