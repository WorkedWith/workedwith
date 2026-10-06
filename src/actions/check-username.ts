'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type UsernameCheckResult =
  | { available: true }
  | { available: false; reason: string }

const USERNAME_RE = /^[a-z0-9-]{3,30}$/

export async function checkUsername(username: string): Promise<UsernameCheckResult> {
  if (!USERNAME_RE.test(username)) {
    return {
      available: false,
      reason: 'Username must be 3–30 characters — letters, numbers, and hyphens only.',
    }
  }

  const admin = createAdminClient()

  // Check both real profiles and seeded profile slugs
  const [{ data: realProfile }, { data: seededProfile }] = await Promise.all([
    admin.from('trade_profiles').select('id').eq('public_slug', username).maybeSingle(),
    admin.from('seeded_profiles').select('id').eq('slug', username).maybeSingle(),
  ])

  if (realProfile || seededProfile) {
    return { available: false, reason: 'This username is already taken.' }
  }

  return { available: true }
}
