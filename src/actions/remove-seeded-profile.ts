'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { normaliseBusinessName, normalisePhone, normaliseEmail, sha256 } from '@/lib/seeded-hash'
import type { SeededProfile } from '@/types/database'

export type RemoveSeededProfileResult =
  | { success: true }
  | { success: false; error: string; code: 'not_found' | 'already_removed' | 'server_error' }

export async function removeSeededProfile(
  claimToken: string,
): Promise<RemoveSeededProfileResult> {
  const admin = createAdminClient()

  const { data: raw } = await admin
    .from('seeded_profiles')
    .select('*')
    .eq('claim_token', claimToken)
    .maybeSingle()

  if (!raw) {
    return { success: false, error: 'Listing not found.', code: 'not_found' }
  }

  const profile = raw as unknown as SeededProfile

  if (profile.status === 'removed') {
    return { success: false, error: 'This listing has already been removed.', code: 'already_removed' }
  }

  // Normalise before hashing so identical identities always produce the same hash
  const phoneHash = profile.contact_phone ? sha256(normalisePhone(profile.contact_phone)) : null
  const emailHash = profile.contact_email ? sha256(normaliseEmail(profile.contact_email)) : null

  await admin.from('do_not_reseed').insert({
    business_name_normalised: normaliseBusinessName(profile.business_name),
    phone_hash: phoneHash,
    email_hash: emailHash,
  })

  const { error: deleteError } = await admin
    .from('seeded_profiles')
    .delete()
    .eq('id', profile.id)

  if (deleteError) {
    console.error('remove-seeded-profile delete error:', deleteError)
    return { success: false, error: 'Failed to remove the listing. Please try again.', code: 'server_error' }
  }

  return { success: true }
}
