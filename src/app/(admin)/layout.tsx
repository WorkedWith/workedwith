import type { Metadata } from 'next'
import { AdminNav } from '@/components/admin/admin-nav'

export const metadata: Metadata = { robots: { index: false } }

// Admin pages read live data with no cookies, so Next would otherwise build them once and
// keep serving that snapshot (an empty queue, for example). Always render fresh.
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
