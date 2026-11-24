import { createClient } from '@/lib/supabase/server'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Sign the browser in as this user after they proved their mobile with a text code. Uses a one time
 * magic link token, verified on the server so the session cookie is set straight away.
 * Server actions and route handlers only.
 */
export async function startSessionFor(admin: AdminClient, userId: string): Promise<boolean> {
  const { data: u } = await admin.auth.admin.getUserById(userId)
  const email = u.user?.email
  if (!email) return false
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !link.properties?.hashed_token) {
    console.error('generateLink failed:', error)
    return false
  }
  const supabase = await createClient()
  const { error: vErr } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
  if (vErr) {
    console.error('verifyOtp failed:', vErr)
    return false
  }
  return true
}

/** Mark the mobile verified the first time a client proves it. Never downgrades an ID checked account. */
export async function markPhoneVerified(admin: AdminClient, userId: string, phone: string): Promise<void> {
  const { data: cur } = await admin.from('users').select('verification_tier').eq('id', userId).maybeSingle()
  await admin
    .from('users')
    .update({
      phone,
      phone_verified: true,
      verification_tier: cur?.verification_tier === 'fully_verified' ? 'fully_verified' : 'phone_verified',
    })
    .eq('id', userId)
}
