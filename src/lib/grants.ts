import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { formatDateLong } from '@/lib/email/format'
import { grantStarted, grantEnding, grantEnded } from '@/lib/email/templates'
import { higherTier, getActiveGrants } from '@/lib/tier'
import type {
  SubscriptionTier,
  TierGrant,
  TierGrantAction,
  TierGrantEndReason,
} from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

export const PLAN_NAME: Record<'standard' | 'pro', string> = { standard: 'Standard', pro: 'Pro' }

export const GRANT_REASON_LABEL: Record<string, string> = {
  founding: 'Founding member',
  goodwill: 'Goodwill',
  partnership: 'Partnership',
  other: 'Other',
}

/** Benefits quoted in the "ending soon" emails. */
const BENEFITS: Record<'standard' | 'pro', string[]> = {
  standard: ['full client lookups with payment reliability and red flags', 'your Member badge', 'a gallery of up to 5 photos'],
  pro: ['your 3 Boosted Districts', 'photos on every confirmed job', 'profile analytics and priority disputes'],
}

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
 * Boosted Districts only exist on a Pro plan. If a user no longer has Pro from either a
 * paid subscription or a grant, clear them (same rule as a cancelled subscription).
 */
export async function clearBoostsIfNotPro(admin: AdminClient, userId: string): Promise<void> {
  const { data: profile } = await admin
    .from('trade_profiles')
    .select('subscription_tier')
    .eq('user_id', userId)
    .maybeSingle()
  const paid = (profile?.subscription_tier as SubscriptionTier | null | undefined) ?? 'free'
  const grants = await getActiveGrants(admin, [userId])
  const grantTier = grants.get(userId)?.tier ?? 'free'
  if (higherTier(paid, grantTier as SubscriptionTier) === 'pro') return
  await admin
    .from('trade_profiles')
    .update({ boosted_districts: [], boosted_districts_updated_at: null })
    .eq('user_id', userId)
}

export async function hasActiveProGrant(admin: AdminClient, userId: string): Promise<boolean> {
  const grants = await getActiveGrants(admin, [userId])
  return grants.get(userId)?.tier === 'pro'
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
  if (grant.tier === 'pro') await clearBoostsIfNotPro(admin, grant.user_id)
}

/**
 * Called when a paid subscription starts or changes. If the new paid plan covers the grant
 * (same or higher tier) the grant ends as superseded. A lower paid plan lets the grant run on.
 */
export async function supersedeGrantIfCovered(admin: AdminClient, userId: string, paidTier: SubscriptionTier): Promise<void> {
  if (paidTier === 'free') return
  const { data } = await admin
    .from('tier_grants')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()
  const grant = data as unknown as TierGrant | null
  if (!grant) return
  if (higherTier(paidTier, grant.tier) === paidTier) {
    await endGrant(admin, grant, 'superseded', null)
  }
}

export async function sendGrantStartedEmail(admin: AdminClient, grant: TierGrant): Promise<void> {
  const ok = await emailUser(admin, grant.user_id, grantStarted({
    plan: PLAN_NAME[grant.tier],
    endsOn: formatDateLong(grant.ends_at) ?? '',
    isPro: grant.tier === 'pro',
  }))
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
      const ok = await emailUser(admin, g.user_id, grantEnded({ plan: PLAN_NAME[g.tier] }))
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
    const benefits = BENEFITS[g.tier]

    if (daysLeft <= 3 && !g.reminder_3_sent_at) {
      const ok = await emailUser(admin, g.user_id, grantEnding({
        plan: PLAN_NAME[g.tier], endsOn: formatDateLong(g.ends_at) ?? '', daysLeft: 3, benefits,
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
        plan: PLAN_NAME[g.tier], endsOn: formatDateLong(g.ends_at) ?? '', daysLeft: 14, benefits,
      }))
      if (ok) {
        await admin.from('tier_grants').update({ reminder_14_sent_at: nowIso }).eq('id', g.id)
        out.reminders++
      }
    }
  }

  return out
}
