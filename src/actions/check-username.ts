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
  const { data } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (data) {
    return { available: false, reason: 'This username is already taken.' }
  }

  return { available: true }
}
