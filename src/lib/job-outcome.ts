import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export type OutcomeLabel = 'Ended early' | 'Outcome disputed'

/** Small label for reviews whose job did not finish normally. Never says who ended it. */
export async function getOutcomeLabels(admin: AdminClient, jobIds: string[]): Promise<Map<string, OutcomeLabel>> {
  const out = new Map<string, OutcomeLabel>()
  if (jobIds.length === 0) return out
  const { data } = await admin.from('jobs').select('id, outcome_disputed').in('id', jobIds).eq('status', 'ended_early')
  for (const j of (data ?? []) as unknown as { id: string; outcome_disputed: boolean }[]) {
    out.set(j.id, j.outcome_disputed ? 'Outcome disputed' : 'Ended early')
  }
  return out
}

/** "Ended early: 2 of 30 jobs", shown once someone has 5 or more confirmed jobs. */
export function endedEarlyLabel(endedEarly: number | null | undefined, totalJobs: number | null | undefined): string | null {
  const e = endedEarly ?? 0
  const t = totalJobs ?? 0
  if (t < 5 || e <= 0) return null
  return `Ended early: ${e} of ${t} jobs`
}
