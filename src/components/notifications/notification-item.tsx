'use client'

import { useState } from 'react'
import { markOneRead } from '@/actions/mark-notifications-read'
import type { Notification, NotificationType } from '@/types/database'

type Props = {
  notification: Notification
  onNavigate?: () => void
}

export function NotificationItem({ notification, onNavigate }: Props) {
  const [isRead, setIsRead] = useState(notification.is_read)

  function handleClick() {
    if (!isRead) {
      setIsRead(true)
      markOneRead(notification.id)
    }
    if (notification.link) {
      onNavigate?.()
      window.location.href = notification.link
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
        !isRead ? 'bg-amber-50/60' : ''
      }`}
    >
      <span className="shrink-0 mt-0.5 text-gray-400">
        <NotificationIcon type={notification.type} />
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug ${
          !isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
        }`}>
          {notification.title ?? 'Notification'}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      {!isRead && (
        <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-brand-amber" aria-hidden />
      )}
    </button>
  )
}

// ── Icon per notification type ────────────────────────────────

function NotificationIcon({ type }: { type: NotificationType | null }) {
  switch (type) {
    case 'job_confirmed':
      return (
        <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      )
    case 'new_review':
    case 'review_window_opened':
      return (
        <svg className="h-5 w-5 text-brand-amber" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
        </svg>
      )
    case 'review_reminder':
      return (
        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
        </svg>
      )
    case 'reviews_published':
      return (
        <svg className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
      )
    case 'dispute_raised':
    case 'dispute_evidence_due':
      return (
        <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      )
    case 'dispute_resolved':
      return (
        <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668.83.75.75 0 01-.336 1.461 31.28 31.28 0 00-1.103-.232l1.702 7.545a.75.75 0 01-.387.832A4.981 4.981 0 0115 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 01-.387-.832l1.77-7.849a31.743 31.743 0 00-3.339-.254v11.505a20.01 20.01 0 013.78.501.75.75 0 11-.339 1.462A18.558 18.558 0 0010 17.5c-1.442 0-2.845.165-4.191.477a.75.75 0 01-.338-1.462 20.01 20.01 0 013.779-.501V4.509a31.743 31.743 0 00-3.339.254l1.77 7.85a.75.75 0 01-.387.83A4.98 4.98 0 015 14a4.98 4.98 0 01-2.294-.556.75.75 0 01-.387-.832L4.02 5.067c-.37.07-.738.148-1.103.232a.75.75 0 01-.336-1.462 33.186 33.186 0 016.668-.829V2.75A.75.75 0 0110 2z" clipRule="evenodd" />
        </svg>
      )
    case 'id_verified':
      return (
        <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.75.75 0 01.232.58 13.368 13.368 0 01-5.83 10.973.531.531 0 01-.618 0 13.368 13.368 0 01-5.83-10.973.75.75 0 01.233-.581 11.947 11.947 0 007.057-2.755zm4.261 4.16a.75.75 0 00-1.06-1.06l-3.094 3.093-1.422-1.422a.75.75 0 00-1.06 1.06l1.953 1.953a.75.75 0 001.06 0l3.623-3.624z" clipRule="evenodd" />
        </svg>
      )
    default:
      return (
        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 8a6 6 0 1112 0c0 1.887.454 3.665 1.257 5.234a.75.75 0 01-.515 1.076 32.94 32.94 0 01-3.256.508 3.5 3.5 0 01-6.972 0 32.933 32.933 0 01-3.256-.508.75.75 0 01-.515-1.076A11.448 11.448 0 004 8zm6 7c-.655 0-1.305-.02-1.95-.057a2 2 0 003.9 0c-.645.038-1.295.057-1.95.057z" clipRule="evenodd" />
        </svg>
      )
  }
}

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
