'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/

/** Admin switches Boosted Districts on or off per district (decision 16). */
export async function setDistrictBoostsEnabled(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) redirect('/')

  const district = String(formData.get('district') ?? '').trim().toUpperCase()
  const enabled = formData.get('enabled') === 'true'
  if (!OUTCODE_RE.test(district)) redirect('/admin/boosts?error=That+district+code+is+not+valid')

  const now = new Date().toISOString()
  await admin.from('boost_district_settings').upsert({
    district,
    boosts_enabled: enabled,
    enabled_at: enabled ? now : null,
    enabled_by: enabled ? user.id : null,
    updated_at: now,
  })
  revalidatePath('/admin/boosts')
  redirect('/admin/boosts')
}
