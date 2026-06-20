'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const admin = createAdminClient()

  // Anonymise reviews — strip identifying content, preserve aggregate ratings
  await admin
    .from('reviews')
    .update({ written_review: null, red_flag: false, red_flag_reason: null })
    .eq('reviewer_id', user.id)

  await supabase.auth.signOut()

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: 'Failed to delete account. Please contact support.' }

  redirect('/')
}
