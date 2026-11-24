import type { createAdminClient } from '@/lib/supabase/admin'
import { runTrialMaintenance } from '@/lib/plan-maintenance'
import { runConnectionMaintenance } from '@/lib/getting-paid/connection-maintenance'
import { runQuoteFollowUps } from '@/lib/quotes/follow-ups'
import { runStageReminders } from '@/lib/stages/reminders'
import { runBankSync } from '@/lib/payments/bank-sync'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Daily v4.2 jobs. Run from the existing 08:00 cron so the project stays within two Vercel crons.
 * Each step is isolated so one failure never stops the rest.
 */
export async function runDailyV42(admin: AdminClient): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {}
  const steps: [string, () => Promise<unknown>][] = [
    ['trials', () => runTrialMaintenance(admin)],
    ['bankConnections', () => runConnectionMaintenance(admin)],
    ['bankSync', () => runBankSync(admin)],
    ['quoteFollowUps', () => runQuoteFollowUps(admin)],
    ['stageReminders', () => runStageReminders(admin)],
  ]
  for (const [name, fn] of steps) {
    try {
      results[name] = await fn()
    } catch (err) {
      console.error(`daily v4.2 step ${name} failed:`, err)
      results[name] = { error: err instanceof Error ? err.message : 'failed' }
    }
  }
  return results
}
