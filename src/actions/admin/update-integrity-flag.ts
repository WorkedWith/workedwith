'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function updateIntegrityFlag(flagId: string, outcome: 'dismissed' | 'actioned') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorised')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!userData?.is_admin) throw new Error('Unauthorised')

  await admin
    .from('review_integrity_flags')
    .update({
      outcome,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', flagId)

  revalidatePath('/admin/integrity')
}
