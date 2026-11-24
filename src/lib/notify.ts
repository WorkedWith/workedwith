import type { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationType } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

/** In app notification. Never throws: a failed notification must not block the action that caused it. */
export async function notify(
  admin: AdminClient,
  userId: string | null | undefined,
  n: { type: NotificationType; title: string; body?: string; link?: string },
): Promise<void> {
  if (!userId) return
  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
  })
  if (error) console.error('notify failed (non-fatal):', error.message)
}
