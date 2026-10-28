'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/app-url'
import { SHARE_DURATIONS, MAX_ACTIVE_SHARE_LINKS } from '@/lib/share-links'

type Result<T extends object = object> = ({ success: true } & T) | { success: false; error: string }

export async function createShareLink(days: number): Promise<Result<{ url: string }>> {
  if (!(SHARE_DURATIONS as readonly number[]).includes(days)) return { success: false, error: 'Choose how long the link lasts.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()

  const { data: cp } = await admin.from('client_profiles').select('id').eq('user_id', user.id).maybeSingle()
  if (!cp) return { success: false, error: 'Only client accounts can share a profile.' }

  const { count } = await admin.from('client_share_links').select('id', { count: 'exact', head: true })
    .eq('client_user_id', user.id).is('revoked_at', null).gt('expires_at', new Date().toISOString())
  if ((count ?? 0) >= MAX_ACTIVE_SHARE_LINKS) return { success: false, error: 'You have a lot of active links. Switch some off first.' }

  const token = randomBytes(24).toString('base64url')
  const { error } = await admin.from('client_share_links').insert({
    client_user_id: user.id,
    token,
    expires_at: new Date(Date.now() + days * 86_400_000).toISOString(),
  })
  if (error) return { success: false, error: 'Could not create the link. Please try again.' }
  revalidatePath('/dashboard')
  return { success: true, url: `${APP_URL}/c/share/${token}` }
}

export async function revokeShareLink(id: string): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()
  const { error } = await admin.from('client_share_links').update({ revoked_at: new Date().toISOString() }).eq('id', id).eq('client_user_id', user.id).is('revoked_at', null)
  if (error) return { success: false, error: 'Could not switch that link off.' }
  revalidatePath('/dashboard')
  return { success: true }
}
