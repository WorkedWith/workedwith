'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addMonths, endGrant, endOfDay, logGrantEvent, sendGrantStartedEmail, clearBoostsIfNotPro, PLAN_NAME } from '@/lib/grants'
import { sendEmail } from '@/lib/email/send'
import { grantEnded } from '@/lib/email/templates'
import { higherTier } from '@/lib/tier'
import type { SubscriptionTier, TierGrant, TierGrantReason, TierGrantTier } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

const BACK = '/admin/grants'

function done(kind: 'notice' | 'error', message: string): never {
  revalidatePath(BACK)
  redirect(`${BACK}?${kind}=${encodeURIComponent(message)}`)
}

async function requireAdmin(): Promise<{ admin: AdminClient; adminId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) redirect('/')
  return { admin, adminId: user.id }
}

function isTier(v: unknown): v is TierGrantTier {
  return v === 'standard' || v === 'pro'
}
function isReason(v: unknown): v is TierGrantReason {
  return v === 'founding' || v === 'goodwill' || v === 'partnership' || v === 'other'
}

async function openGrantFor(admin: AdminClient, userId: string): Promise<TierGrant | null> {
  const { data } = await admin.from('tier_grants').select('*').eq('user_id', userId).is('ended_at', null).maybeSingle()
  return (data as unknown as TierGrant | null) ?? null
}

type CreateInput = {
  userId: string
  tier: TierGrantTier
  startsAt: Date
  endsAt: Date
  reason: TierGrantReason
  note: string | null
}

async function createGrant(admin: AdminClient, adminId: string, input: CreateInput): Promise<string | null> {
  const { data: profile } = await admin
    .from('trade_profiles')
    .select('subscription_tier')
    .eq('user_id', input.userId)
    .maybeSingle()
  if (!profile) return 'That user does not have a trade profile.'

  const paid = ((profile.subscription_tier as SubscriptionTier | null) ?? 'free')
  if (higherTier(paid, input.tier) === paid && paid !== 'free') {
    return `They already pay for ${PLAN_NAME[paid as TierGrantTier]}, which covers this grant.`
  }
  if (await openGrantFor(admin, input.userId)) {
    return 'They already have an active or scheduled grant. Extend or end that one first.'
  }
  if (input.endsAt <= input.startsAt) return 'The end date must be after the start date.'
  if (input.endsAt <= new Date()) return 'The end date is in the past.'

  const { data: created, error } = await admin
    .from('tier_grants')
    .insert({
      user_id: input.userId,
      tier: input.tier,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      reason: input.reason,
      note: input.note,
      granted_by: adminId,
    })
    .select('*')
    .single()
  if (error || !created) return `Could not create the grant: ${error?.message ?? 'unknown error'}`

  const grant = created as unknown as TierGrant
  await logGrantEvent(admin, grant.id, 'created', adminId, null, {
    tier: grant.tier, starts_at: grant.starts_at, ends_at: grant.ends_at, reason: grant.reason,
  })
  if (input.startsAt <= new Date()) await sendGrantStartedEmail(admin, grant)
  return null
}

export async function createGrantAction(formData: FormData): Promise<void> {
  const { admin, adminId } = await requireAdmin()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const tier = formData.get('tier')
  const reason = formData.get('reason')
  const startMode = String(formData.get('startMode') ?? 'now')
  const startDate = String(formData.get('startDate') ?? '')
  const endMode = String(formData.get('endMode') ?? 'months')
  const months = Number(formData.get('months') ?? 0)
  const endDate = String(formData.get('endDate') ?? '')
  const note = String(formData.get('note') ?? '').trim().slice(0, 500) || null

  if (!email) done('error', 'Enter the trade’s email address.')
  if (!isTier(tier)) done('error', 'Choose Standard or Pro.')
  if (!isReason(reason)) done('error', 'Choose a reason.')

  const { data: user } = await admin.from('users').select('id').ilike('email', email).maybeSingle()
  if (!user) done('error', 'No user with that email address.')

  const now = new Date()
  const startsAt = startMode === 'date' && startDate ? new Date(`${startDate}T00:00:00.000Z`) : now
  if (Number.isNaN(startsAt.getTime())) done('error', 'That start date is not valid.')

  let endsAt: Date
  if (endMode === 'date') {
    if (!endDate) done('error', 'Choose an end date.')
    endsAt = endOfDay(endDate)
  } else {
    if (![1, 3, 6, 12].includes(months)) done('error', 'Choose 1, 3, 6 or 12 months.')
    endsAt = addMonths(startsAt, months)
  }
  if (Number.isNaN(endsAt.getTime())) done('error', 'That end date is not valid.')

  const err = await createGrant(admin, adminId, {
    userId: user.id as string, tier, startsAt, endsAt, reason, note,
  })
  if (err) done('error', err)
  done('notice', `Granted ${PLAN_NAME[tier]} to ${email}.`)
}

/** One click founding offer: 6 months of Standard, reason Founding member. */
export async function giveFoundingOfferAction(formData: FormData): Promise<void> {
  const { admin, adminId } = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  if (!userId) done('error', 'Missing user.')
  const now = new Date()
  const err = await createGrant(admin, adminId, {
    userId, tier: 'standard', startsAt: now, endsAt: addMonths(now, 6), reason: 'founding', note: null,
  })
  if (err) done('error', err)
  done('notice', 'Founding offer given: 6 months of Standard.')
}

export async function extendGrantAction(formData: FormData): Promise<void> {
  const { admin, adminId } = await requireAdmin()
  const grantId = String(formData.get('grantId') ?? '')
  const endDate = String(formData.get('endDate') ?? '')
  if (!grantId || !endDate) done('error', 'Choose a new end date.')

  const { data } = await admin.from('tier_grants').select('*').eq('id', grantId).is('ended_at', null).maybeSingle()
  const grant = data as unknown as TierGrant | null
  if (!grant) done('error', 'That grant is not open any more.')

  const newEnd = endOfDay(endDate)
  if (Number.isNaN(newEnd.getTime()) || newEnd <= new Date(grant.starts_at) || newEnd <= new Date()) {
    done('error', 'The new end date must be in the future and after the start.')
  }

  const later = newEnd > new Date(grant.ends_at)
  await admin.from('tier_grants').update({
    ends_at: newEnd.toISOString(),
    updated_at: new Date().toISOString(),
    // A later end date means the reminders should fire again
    ...(later ? { reminder_14_sent_at: null, reminder_3_sent_at: null } : {}),
  }).eq('id', grant.id)
  await logGrantEvent(admin, grant.id, 'extended', adminId, { ends_at: grant.ends_at }, { ends_at: newEnd.toISOString() })
  done('notice', 'End date updated.')
}

export async function changeGrantTierAction(formData: FormData): Promise<void> {
  const { admin, adminId } = await requireAdmin()
  const grantId = String(formData.get('grantId') ?? '')
  const tier = formData.get('tier')
  if (!grantId || !isTier(tier)) done('error', 'Choose a plan.')

  const { data } = await admin.from('tier_grants').select('*').eq('id', grantId).is('ended_at', null).maybeSingle()
  const grant = data as unknown as TierGrant | null
  if (!grant) done('error', 'That grant is not open any more.')
  if (grant.tier === tier) done('notice', 'No change.')

  await admin.from('tier_grants').update({ tier, updated_at: new Date().toISOString() }).eq('id', grant.id)
  await logGrantEvent(admin, grant.id, 'tier_changed', adminId, { tier: grant.tier }, { tier })
  if (grant.tier === 'pro' && tier !== 'pro') await clearBoostsIfNotPro(admin, grant.user_id)
  done('notice', `Plan changed to ${PLAN_NAME[tier]}.`)
}

export async function endGrantEarlyAction(formData: FormData): Promise<void> {
  const { admin, adminId } = await requireAdmin()
  const grantId = String(formData.get('grantId') ?? '')
  if (!grantId) done('error', 'Missing grant.')

  const { data } = await admin.from('tier_grants').select('*').eq('id', grantId).is('ended_at', null).maybeSingle()
  const grant = data as unknown as TierGrant | null
  if (!grant) done('error', 'That grant is not open any more.')

  await endGrant(admin, grant, 'ended_early', adminId)

  // Only tell them if the grant had actually started
  if (new Date(grant.starts_at) <= new Date()) {
    const { data: u } = await admin.from('users').select('email').eq('id', grant.user_id).maybeSingle()
    const to = u?.email as string | undefined
    if (to) {
      const r = await sendEmail(to, grantEnded({ plan: PLAN_NAME[grant.tier] }))
      if (!r.ok) console.error('Grant ended email failed (non-fatal):', r.error)
    }
  }
  done('notice', 'Grant ended.')
}
