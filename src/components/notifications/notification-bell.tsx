'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { getNotifications } from '@/actions/get-notifications'
import { markAllRead } from '@/actions/mark-notifications-read'
import { NotificationItem } from './notification-item'
import type { Notification } from '@/types/database'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  async function fetchNotifications() {
    const result = await getNotifications()
    setNotifications(result.notifications)
    setUnreadCount(result.unreadCount)
  }

  // Initial fetch + 60-second polling
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    })
  }

  const recent = notifications.slice(0, 20)

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        className="relative p-2 text-white/80 hover:text-white transition-colors rounded-lg"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center
              rounded-full bg-brand-amber px-1 text-[10px] font-bold text-brand-navy leading-none"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-brand-navy">Notifications</span>
            <div className="flex items-center gap-4">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="text-xs text-gray-500 hover:text-brand-navy transition-colors disabled:opacity-40"
                >
                  Mark all read
                </button>
              )}
              <a
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-brand-amber hover:underline"
              >
                See all
              </a>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[28rem] overflow-y-auto divide-y divide-gray-50">
            {recent.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <BellIcon className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No notifications yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  You&apos;ll be notified about jobs, reviews, and disputes here.
                </p>
              </div>
            ) : (
              recent.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onNavigate={() => setIsOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
