'use server'

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SeededProfile } from '@/types/database'

export type RemoveSeededProfileResult =
  | { success: true }
  | { success: false; error: string; code: 'not_found' | 'already_removed' | 'server_error' }

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

function normaliseBusinessName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

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

  // Write to do_not_reseed before deleting
  const phoneHash = profile.contact_phone ? sha256(profile.contact_phone) : null
  const emailHash = profile.contact_email ? sha256(profile.contact_email) : null

  await admin.from('do_not_reseed').insert({
    business_name_normalised: normaliseBusinessName(profile.business_name),
    phone_hash: phoneHash,
    email_hash: emailHash,
  })

  // Hard-delete the seeded profile (removes contact data)
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
