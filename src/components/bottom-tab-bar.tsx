'use client'

import { usePathname } from 'next/navigation'
import type { NavLink } from '@/components/app-nav'

function active(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** On phones the main navigation is a bottom tab bar (PRD 18). */
export function BottomTabBar({ links }: { links: NavLink[] }) {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map(l => {
          const on = active(pathname, l.href)
          return (
            <li key={l.href}>
              <a href={l.href} aria-current={on ? 'page' : undefined} className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold ${on ? 'text-brand-navy' : 'text-gray-500'}`}>
                <span className={`h-1 w-6 rounded-full ${on ? 'bg-brand-amber' : 'bg-transparent'}`} aria-hidden="true" />
                {l.shortLabel ?? l.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
