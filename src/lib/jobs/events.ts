import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Add a line to the job's timeline. Never throws. */
export async function logJobEvent(admin: AdminClient, jobId: string, kind: string, summary: string, actorUserId: string | null, data?: Record<string, unknown>): Promise<void> {
  const { error } = await admin.from('job_events').insert({ job_id: jobId, kind, summary, actor_user_id: actorUserId, data: data ?? null })
  if (error) console.error('job event failed (non-fatal):', error.message)
}

/** Person client inside the 14 day cancellation period, with no early start consent yet (PRD 7). */
export function needsConsentToStartOn(job: { client_type_at_acceptance: string | null; cancellation_period_ends_at: string | null; early_start_consent_at: string | null }, date: Date): boolean {
  if (job.client_type_at_acceptance !== 'person' || job.early_start_consent_at) return false
  if (!job.cancellation_period_ends_at) return false
  return date.getTime() < new Date(job.cancellation_period_ends_at).getTime()
}
