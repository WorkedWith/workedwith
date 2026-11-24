import type { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { trialReminder } from '@/lib/email/templates'
import { formatDateLong } from '@/lib/email/format'
import { refreshPlanState } from '@/lib/plan'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Daily: trial reminders at day 23, 28 and 30, then lapse (PRD 3). A trade who added a card is
 * already 'active' and is skipped.
 */
export async function runTrialMaintenance(admin: AdminClient): Promise<{ reminders: number; lapsed: number }> {
  const out = { reminders: 0, lapsed: 0 }
  const { data } = await admin
    .from('trade_profiles')
    .select('user_id, trial_started_at, trial_ends_at, trial_reminder_23_sent_at, trial_reminder_28_sent_at, trial_reminder_30_sent_at')
    .eq('subscription_status', 'trialing')
    .limit(2000)

  for (const t of data ?? []) {
    const userId = t.user_id as string
    const ends = t.trial_ends_at ? new Date(t.trial_ends_at as string) : null
    if (!ends) continue
    const daysLeft = Math.ceil((ends.getTime() - Date.now()) / 86_400_000)

    if (daysLeft <= 0) {
      const listed = await refreshPlanState(admin, userId)
      if (!listed) out.lapsed++
      continue
    }

    // Trial day = 30 - days left
    const day = 30 - daysLeft
    const due: (23 | 28 | 30)[] = []
    if (day >= 29 && !t.trial_reminder_30_sent_at) due.push(30)
    else if (day >= 28 && !t.trial_reminder_28_sent_at) due.push(28)
    else if (day >= 23 && !t.trial_reminder_23_sent_at) due.push(23)
    if (due.length === 0) continue

    const { data: u } = await admin.from('users').select('email').eq('id', userId).maybeSingle()
    if (!u?.email) continue
    const which = due[0]
    const r = await sendEmail(u.email as string, trialReminder({ day: which, endsOn: formatDateLong(ends) ?? '' }))
    if (r.ok) {
      const at = new Date().toISOString()
      const patch = which === 30 ? { trial_reminder_30_sent_at: at } : which === 28 ? { trial_reminder_28_sent_at: at } : { trial_reminder_23_sent_at: at }
      await admin.from('trade_profiles').update(patch).eq('user_id', userId)
      out.reminders++
    }
  }
  return out
}
