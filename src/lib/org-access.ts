import type { SupabaseClient } from '@supabase/supabase-js'
import type { Organisation, OrganisationMemberRole } from '@/types/database'

export type OrgContext = {
  org: Organisation
  role: OrganisationMemberRole
  /** The user whose client profile carries the business's jobs and reviews. */
  identityUserId: string
  canManage: boolean
}

/** The organisation this user belongs to, their role, and whose client profile holds its record. */
export async function getOrgContext(admin: SupabaseClient, userId: string): Promise<OrgContext | null> {
  const { data: m } = await admin.from('organisation_members').select('organisation_id, role').eq('user_id', userId).maybeSingle()
  const member = m as { organisation_id: string | null; role: OrganisationMemberRole | null } | null
  if (!member?.organisation_id || !member.role) return null
  const { data: o } = await admin.from('organisations').select('*').eq('id', member.organisation_id).maybeSingle()
  const org = o as unknown as Organisation | null
  if (!org) return null
  const identityUserId = org.primary_contact_user_id ?? org.owner_id
  if (!identityUserId) return null
  return { org, role: member.role, identityUserId, canManage: member.role === 'owner' || member.role === 'admin' }
}

/** True if the user is the reviewee, or an owner or admin of the business that the reviewee speaks for. */
export async function canActForReviewee(admin: SupabaseClient, actingUserId: string, revieweeId: string): Promise<boolean> {
  if (actingUserId === revieweeId) return true
  const ctx = await getOrgContext(admin, actingUserId)
  return !!ctx && ctx.canManage && ctx.identityUserId === revieweeId
}

/**
 * The party this person speaks for on a job. Their own id if they are the party, or the business
 * record holder's id if they are a phone verified member of that business. Null if neither.
 */
export async function actingPartyId(admin: SupabaseClient, actingUserId: string, partyUserId: string | null): Promise<string | null> {
  if (!partyUserId) return null
  if (actingUserId === partyUserId) return partyUserId
  const ctx = await getOrgContext(admin, actingUserId)
  if (!ctx || ctx.identityUserId !== partyUserId) return null
  const { data: u } = await admin.from('users').select('phone_verified').eq('id', actingUserId).maybeSingle()
  return (u as { phone_verified: boolean } | null)?.phone_verified ? partyUserId : null
}
