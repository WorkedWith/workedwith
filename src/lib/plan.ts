import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionStatus, TierGrant } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

/** The one plan (PRD 3). */
export const PLAN_NAME = 'WorkedWith'
export const PLAN_PRICE_TEXT = '£19.99 a month'
export const PLAN_PRICE_PENCE = 1999
export const TRIAL_DAYS = 30
export const BOOST_PRICE_TEXT = '£10 a month'

export type PlanFields = {
  subscription_status: SubscriptionStatus | string | null
  trial_ends_at: string | null
}

/** A grant counts only between its start and end, and only while it has not been ended. */
export function isGrantActive(
  grant: Pick<TierGrant, 'starts_at' | 'ends_at' | 'ended_at'>,
  now: Date = new Date(),
): boolean {
  if (grant.ended_at) return false
  return new Date(grant.starts_at) <= now && new Date(grant.ends_at) > now
}

export function isTrialLive(p: PlanFields, now: Date = new Date()): boolean {
  return p.subscription_status === 'trialing' && !!p.trial_ends_at && new Date(p.trial_ends_at) > now
}

/**
 * The single "has active plan" check (PRD 20 phase 0 item 2). True when the trade is in a live
 * trial, on the paid plan, or has an active admin grant.
 */
export function hasActivePlanFrom(p: PlanFields | null | undefined, grant?: TierGrant | null): boolean {
  if (grant && isGrantActive(grant)) return true
  if (!p) return false
  return p.subscription_status === 'active' || isTrialLive(p)
}

/** Boosts are only for trades on the paid plan, never during the free trial (decision 17). */
export function isOnPaidPlan(p: PlanFields & { stripe_subscription_id?: string | null }): boolean {
  if (p.subscription_status !== 'active') return false
  if (p.trial_ends_at && new Date(p.trial_ends_at) > new Date()) return false
  return true
}

export function trialDaysLeft(p: PlanFields, now: Date = new Date()): number | null {
  if (p.subscription_status !== 'trialing' || !p.trial_ends_at) return null
  return Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - now.getTime()) / 86_400_000))
}

/** Active grants for a set of trade users, keyed by user id. */
export async function getActiveGrants(admin: AdminClient, userIds: string[]): Promise<Map<string, TierGrant>> {
  const map = new Map<string, TierGrant>()
  if (userIds.length === 0) return map
  const nowIso = new Date().toISOString()
  const { data } = await admin
    .from('tier_grants')
    .select('*')
    .in('user_id', userIds)
    .is('ended_at', null)
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)
  for (const row of (data ?? []) as unknown as TierGrant[]) map.set(row.user_id, row)
  return map
}

export type PlanState = {
  hasPlan: boolean
  status: SubscriptionStatus
  trialEndsAt: string | null
  trialDaysLeft: number | null
  onPaidPlan: boolean
  grant: TierGrant | null
}

export async function getPlanState(userId: string, admin: AdminClient = createAdminClient()): Promise<PlanState> {
  const { data } = await admin
    .from('trade_profiles')
    .select('subscription_status, trial_ends_at, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()
  const grants = await getActiveGrants(admin, [userId])
  const grant = grants.get(userId) ?? null
  const fields: PlanFields = {
    subscription_status: (data?.subscription_status as SubscriptionStatus | undefined) ?? 'lapsed',
    trial_ends_at: (data?.trial_ends_at as string | null | undefined) ?? null,
  }
  return {
    hasPlan: hasActivePlanFrom(fields, grant),
    status: fields.subscription_status as SubscriptionStatus,
    trialEndsAt: fields.trial_ends_at,
    trialDaysLeft: trialDaysLeft(fields),
    onPaidPlan: isOnPaidPlan(fields),
    grant,
  }
}

export async function hasActivePlan(userId: string, admin: AdminClient = createAdminClient()): Promise<boolean> {
  return (await getPlanState(userId, admin)).hasPlan
}

/** Same check for many trades at once (search, admin lists). */
export async function getActivePlans(
  admin: AdminClient,
  rows: ({ user_id: string } & PlanFields)[],
): Promise<Map<string, boolean>> {
  const grants = await getActiveGrants(admin, rows.map(r => r.user_id))
  const out = new Map<string, boolean>()
  for (const r of rows) out.set(r.user_id, hasActivePlanFrom(r, grants.get(r.user_id)))
  return out
}

/**
 * Lapse rules (PRD 3). Recomputes whether the trade is listed, and moves an ended trial to lapsed.
 * Lapsed trades are hidden from the directory; boosts end when the paid plan ends.
 */
export async function refreshPlanState(admin: AdminClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from('trade_profiles')
    .select('subscription_status, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return false
  const status = data.subscription_status as SubscriptionStatus
  const trialEnds = data.trial_ends_at as string | null
  const grants = await getActiveGrants(admin, [userId])
  const nextStatus: SubscriptionStatus =
    status === 'trialing' && (!trialEnds || new Date(trialEnds) <= new Date()) ? 'lapsed' : status
  const listed = hasActivePlanFrom({ subscription_status: nextStatus, trial_ends_at: trialEnds }, grants.get(userId))
  await admin
    .from('trade_profiles')
    .update({ subscription_status: nextStatus, is_searchable: listed })
    .eq('user_id', userId)
  return listed
}
