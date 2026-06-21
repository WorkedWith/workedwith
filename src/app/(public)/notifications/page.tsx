import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { markAllRead } from '@/actions/mark-notifications-read'
import { NotificationItem } from '@/components/notifications/notification-item'
import type { Notification } from '@/types/database'

export const metadata = { title: 'Notifications — WorkedWith' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const notifications = (data ?? []) as unknown as Notification[]
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Notifications</h1>
            {unreadCount > 0 && (
              <p className="mt-0.5 text-sm text-gray-500">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <form action={markAllRead}>
              <button
                type="submit"
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium
                  text-gray-600 shadow-sm hover:bg-gray-50 hover:text-brand-navy transition-colors"
              >
                Mark all read
              </button>
            </form>
          )}
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(notification => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Notifications older than 90 days are automatically removed.
        </p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="px-6 py-20 text-center">
      <svg
        className="mx-auto h-12 w-12 text-gray-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <h3 className="mt-4 text-base font-semibold text-gray-700">No notifications yet</h3>
      <p className="mt-1 text-sm text-gray-400">
        You&apos;ll see job updates, reviews, and dispute activity here.
      </p>
    </div>
  )
}
