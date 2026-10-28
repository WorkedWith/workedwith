'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DISTRICT_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/

export async function saveFocusDistricts(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return

  const raw = String(formData.get('districts') ?? '')
  const districts = Array.from(new Set(raw.split(/[\s,]+/).map(d => d.trim().toUpperCase()).filter(d => DISTRICT_RE.test(d)))).slice(0, 10)
  if (districts.length === 0) return
  await admin.from('admin_settings').upsert({ key: 'focus_districts', value: districts })
  revalidatePath('/admin/analytics')
}
