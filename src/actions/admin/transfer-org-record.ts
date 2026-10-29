'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type TransferResult = { success: true } | { success: false; error: string }

/** Admin only: moves a business's jobs, reviews and client profile to another member. */
export async function transferOrgRecord(orgId: string, toUserId: string, note: string): Promise<TransferResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return { success: false, error: 'Admins only.' }

  const { data, error } = await admin.rpc('transfer_org_record', {
    p_org: orgId,
    p_to: toUserId,
    p_admin: user.id,
    p_note: note.trim().slice(0, 300) || null,
  })
  if (error) return { success: false, error: 'The transfer failed. Nothing was changed.' }
  if (data !== 'ok') return { success: false, error: String(data) }
  revalidatePath('/admin/organisations')
  return { success: true }
}
