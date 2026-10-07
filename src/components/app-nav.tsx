'use client'

import { usePathname } from 'next/navigation'

export type NavLink = { href: string; label: string }

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label="Main" className="border-t border-white/10">
      <div className="mx-auto flex max-w-3xl justify-center gap-1 overflow-x-auto px-2 sm:px-4">
        {links.map(link => {
          const active = isActive(pathname, link.href)
          return (
            <a
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'border-brand-amber text-white'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
