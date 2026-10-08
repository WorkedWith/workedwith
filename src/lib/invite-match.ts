import type { PendingInvite } from '@/types/database'

type Person = { email: string | null; phone: string | null; phone_verified: boolean }

/** An invite belongs to a user if its phone (verified) or its email matches their account. */
export function inviteMatchesUser(
  invite: Pick<PendingInvite, 'contact_phone' | 'contact_email'>,
  user: Person,
): boolean {
  const phoneMatch = !!invite.contact_phone && user.phone_verified && user.phone === invite.contact_phone
  const emailMatch =
    !!invite.contact_email && !!user.email && user.email.toLowerCase() === invite.contact_email.toLowerCase()
  return phoneMatch || emailMatch
}
