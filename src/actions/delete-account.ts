'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { createHash } from 'crypto'
import { sendEmail } from '@/lib/email/send'
import { accountDeleted } from '@/lib/email/templates'

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const admin = createAdminClient()
  const emailBeforeDelete = user.email ?? null

  // Record the phone number as deactivated BEFORE anything is deleted, so it can
  // never be used to open a new account. Fail closed: if this cannot be written,
  // the account is not deleted.
  const { data: profile } = await admin
    .from('users')
    .select('phone')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.phone) {
    const { error: blockError } = await admin
      .from('deactivated_identities')
      .upsert(
        {
          identity_hash: createHash('sha256').update(profile.phone).digest('hex'),
          identity_type: 'phone',
          deactivated_by: null,
          reason: 'account_deleted',
        },
        { onConflict: 'identity_hash,identity_type', ignoreDuplicates: true },
      )
    if (blockError) return { error: 'Failed to delete account. Please contact support.' }
  }

  // Anonymise reviews — strip identifying content, preserve aggregate ratings
  await admin
    .from('reviews')
    .update({ written_review: null, red_flag: false, red_flag_reason: null })
    .eq('reviewer_id', user.id)

  await supabase.auth.signOut()

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: 'Failed to delete account. Please contact support.' }

  if (emailBeforeDelete) {
    const r = await sendEmail(emailBeforeDelete, accountDeleted())
    if (!r.ok) console.error('Account deleted email failed (non-fatal):', r.error)
  }

  redirect('/')
}
