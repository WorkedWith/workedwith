import { NotificationBell } from '@/components/notifications/notification-bell'

export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="bg-brand-navy px-4 py-3 sm:px-6 sticky top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <a href="/dashboard" className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <NotificationBell />
        </div>
      </nav>
      {children}
    </>
  )
}
