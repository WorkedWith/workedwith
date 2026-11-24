import type { createAdminClient } from '@/lib/supabase/admin'
import type { JobBundle } from '@/lib/jobs/load'

type AdminClient = ReturnType<typeof createAdminClient>

/** Sections added by later phases (start dates, stages, payments, invoices, variations, chasing, reviews). */
export async function TradeJobSections({ admin, bundle }: { admin: AdminClient; bundle: JobBundle }) {
  void admin
  void bundle
  return null
}
