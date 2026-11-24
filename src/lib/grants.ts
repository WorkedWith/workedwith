import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { formatDateLong } from '@/lib/email/format'
import { grantStarted, grantEnding, grantEnded } from '@/lib/email/templates'
import { refreshPlanState } from '@/lib/plan'
import type {
  TierGrant,
  TierGrantAction,
  TierGrantEndReason,
} from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

export const GRANT_PLAN_NAME = 'the WorkedWith plan'

export const GRANT_REASON_LABEL: Record<string, string> = {
  founding: 'Founding member',
  goodwill: 'Goodwill',
  partnership: 'Partnership',
  other: 'Other',
}

/** Benefits quoted in the "ending soon" emails. */
const BENEFITS: string[] = [
  'quotes, invoices and automatic chasing',
  'bank transfers that mark themselves paid',
  'your directory listing and client records',
]

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

/** A specific end date means the end of that day (UTC). */
export function endOfDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59.000Z`)
}

export async function logGrantEvent(
  admin: AdminClient,
  grantId: string,
  action: TierGrantAction,
  actor: string | null,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await admin.from('tier_grant_events').insert({
    grant_id: grantId,
    action,
    actor,
    before_values: before,
    after_values: after,
  })
  if (error) console.error('logGrantEvent failed (non-fatal):', error.message)
}

async function emailUser(admin: AdminClient, userId: string, content: Parameters<typeof sendEmail>[1]): Promise<boolean> {
  const { data } = await admin.from('users').select('email').eq('id', userId).maybeSingle()
  const to = data?.email as string | undefined
  if (!to) return false
  const r = await sendEmail(to, content)
  if (!r.ok) console.error('Grant email failed (non-fatal):', r.error)
  return r.ok
}

/**
 * Boosts are billed on the Stripe subscription, so a grant never carries boosts.
 * When a grant ends, recompute whether the trade is still listed.
 */
export async function afterGrantChange(admin: AdminClient, userId: string): Promise<void> {
  await refreshPlanState(admin, userId)
}

/** Ends a grant and records why. Safe to call twice. */
export async function endGrant(
  admin: AdminClient,
  grant: TierGrant,
  reason: TierGrantEndReason,
  actor: string | null,
): Promise<void> {
  if (grant.ended_at) return
  const now = new Date().toISOString()
  const { error } = await admin
    .from('tier_grants')
    .update({ ended_at: now, ended_reason: reason, ended_by: actor, updated_at: now })
    .eq('id', grant.id)
    .is('ended_at', null)
  if (error) {
    console.error('endGrant failed:', error.message)
    return
  }
  const action: TierGrantAction = reason === 'expired' ? 'expired' : reason === 'superseded' ? 'superseded' : 'ended_early'
  await logGrantEvent(admin, grant.id, action, actor, { ends_at: grant.ends_at, tier: grant.tier }, { ended_reason: reason })
  await afterGrantChange(admin, grant.user_id)
}

/** Called when a paid subscription starts. A paid plan covers any grant, so the grant ends as superseded. */
export async function supersedeGrantIfCovered(admin: AdminClient, userId: string): Promise<void> {
  const { data } = await admin
    .from('tier_grants')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()
  const grant = data as unknown as TierGrant | null
  if (!grant) return
  await endGrant(admin, grant, 'superseded', null)
}

export async function sendGrantStartedEmail(admin: AdminClient, grant: TierGrant): Promise<void> {
  const ok = await emailUser(admin, grant.user_id, grantStarted({
    plan: GRANT_PLAN_NAME,
    endsOn: formatDateLong(grant.ends_at) ?? '',
  }))
  await afterGrantChange(admin, grant.user_id)
  if (ok) {
    await admin.from('tier_grants').update({ started_email_sent_at: new Date().toISOString() }).eq('id', grant.id)
  }
}

/**
 * Daily housekeeping, run from the existing 03:00 cron:
 * start emails, 14 day and 3 day reminders, and expiry.
 */
export async function runGrantMaintenance(admin: AdminClient): Promise<{ started: number; reminders: number; expired: number }> {
  const now = new Date()
  const nowIso = now.toISOString()
  const out = { started: 0, reminders: 0, expired: 0 }

  const { data } = await admin.from('tier_grants').select('*').is('ended_at', null)
  const open = (data ?? []) as unknown as TierGrant[]

  for (const g of open) {
    const starts = new Date(g.starts_at)
    const ends = new Date(g.ends_at)

    // Expired: end it (the effective tier helper already ignores it at read time)
    if (ends <= now) {
      await endGrant(admin, g, 'expired', null)
      const ok = await emailUser(admin, g.user_id, grantEnded({ plan: GRANT_PLAN_NAME }))
      if (ok) await admin.from('tier_grants').update({ ended_email_sent_at: nowIso }).eq('id', g.id)
      out.expired++
      continue
    }

    if (starts > now) continue // scheduled, nothing to do yet

    if (!g.started_email_sent_at) {
      await sendGrantStartedEmail(admin, g)
      out.started++
    }

    const daysLeft = Math.ceil((ends.getTime() - now.getTime()) / 86_400_000)
    const benefits = BENEFITS

    if (daysLeft <= 3 && !g.reminder_3_sent_at) {
      const ok = await emailUser(admin, g.user_id, grantEnding({
        plan: GRANT_PLAN_NAME, endsOn: formatDateLong(g.ends_at) ?? '', daysLeft: 3, benefits,
      }))
      if (ok) {
        // A grant created with under 14 days left should not also get the 14 day email
        await admin.from('tier_grants').update({
          reminder_3_sent_at: nowIso,
          ...(g.reminder_14_sent_at ? {} : { reminder_14_sent_at: nowIso }),
        }).eq('id', g.id)
        out.reminders++
      }
    } else if (daysLeft <= 14 && daysLeft > 3 && !g.reminder_14_sent_at) {
      const ok = await emailUser(admin, g.user_id, grantEnding({
        plan: GRANT_PLAN_NAME, endsOn: formatDateLong(g.ends_at) ?? '', daysLeft: 14, benefits,
      }))
      if (ok) {
        await admin.from('tier_grants').update({ reminder_14_sent_at: nowIso }).eq('id', g.id)
        out.reminders++
      }
    }
  }

  return out
}
