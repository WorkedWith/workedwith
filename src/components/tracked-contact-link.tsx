'use client'

import { logContactClick } from '@/actions/log-search-outcome'

export function TrackedContactLink({
  href, kind, tradeProfileId, searchId, className, children,
}: { href: string; kind: 'call' | 'email'; tradeProfileId: string; searchId: string | null; className: string; children: React.ReactNode }) {
  return (
    <a href={href} className={className} onClick={() => { void logContactClick(tradeProfileId, kind, searchId) }}>
      {children}
    </a>
  )
}
