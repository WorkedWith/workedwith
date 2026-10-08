'use client'

import { usePathname } from 'next/navigation'

export type NavLink = { href: string; label: string; shortLabel?: string }

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label="Main" className="border-t border-white/10">
      <div className="mx-auto flex max-w-3xl justify-center gap-0 overflow-x-auto px-2 sm:gap-1 sm:px-4">
        {links.map(link => {
          const active = isActive(pathname, link.href)
          return (
            <a
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-2.5 py-2.5 sm:px-3 text-sm font-semibold transition-colors ${
                active
                  ? 'border-brand-amber text-white'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {link.shortLabel ? (
                <>
                  <span className="sm:hidden">{link.shortLabel}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </>
              ) : link.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
