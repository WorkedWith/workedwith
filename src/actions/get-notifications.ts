'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Notification } from '@/types/database'

export type NotificationsResult = {
  notifications: Notification[]
  unreadCount: number
}

export async function getNotifications(): Promise<NotificationsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { notifications: [], unreadCount: 0 }

  const admin = createAdminClient()
  const { data } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const notifications = (data ?? []) as unknown as Notification[]
  const unreadCount = notifications.filter(n => !n.is_read).length

  return { notifications, unreadCount }
}
