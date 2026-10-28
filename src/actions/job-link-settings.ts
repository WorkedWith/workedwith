'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function setJobLinkPaused(paused: boolean): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()
  const { error } = await admin.from('trade_profiles').update({ job_link_paused: paused }).eq('user_id', user.id)
  if (error) return { success: false, error: 'Could not save that. Please try again.' }
  revalidatePath('/dashboard')
  return { success: true }
}
