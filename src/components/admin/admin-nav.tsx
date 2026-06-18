'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', icon: GridIcon },
  { href: '/admin/verification', label: 'Verification', icon: BadgeCheckIcon },
  { href: '/admin/disputes', label: 'Disputes', icon: ScaleIcon },
  { href: '/admin/flags', label: 'Flagged Reviews', icon: FlagIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/search-audit', label: 'Search Audit', icon: SearchIcon },
]

function isActive(href: string, pathname: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname.startsWith(href)
}

export function AdminNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-brand-navy min-h-screen">
        <div className="px-5 py-5 border-b border-white/10">
          <a href="/admin" className="text-xl font-bold text-white tracking-tight">
            Worked<span className="text-brand-amber">With</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Admin</span>
          </a>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {links.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(href, pathname)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </a>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <a href="/dashboard" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            ← Back to app
          </a>
        </div>
      </aside>

      {/* ── Mobile header ────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 bg-brand-navy px-4 py-3 flex items-center justify-between">
        <a href="/admin" className="text-lg font-bold text-white">
          Worked<span className="text-brand-amber">With</span>
          <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/40">Admin</span>
        </a>
        <button
          onClick={() => setMobileOpen(v => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </header>

      {/* ── Mobile slide-in nav ──────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="w-64 bg-brand-navy flex flex-col">
            <div className="h-14" /> {/* header spacer */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {links.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(href, pathname)
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </a>
              ))}
            </nav>
            <div className="px-5 py-4 border-t border-white/10">
              <a href="/dashboard" className="text-xs text-white/40 hover:text-white/70 transition-colors">
                ← Back to app
              </a>
            </div>
          </div>
          {/* backdrop */}
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}

// ── Icons ────────────────────────────────────────────────────

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
    </svg>
  )
}

function BadgeCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  )
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 2a.75.75 0 0 1 .75.75v.258a33.186 33.186 0 0 1 6.668.83.75.75 0 0 1-.336 1.461 31.28 31.28 0 0 0-1.103-.232l1.702 7.545a.75.75 0 0 1-.387.832A4.981 4.981 0 0 1 15 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 0 1-.387-.832l1.77-7.849a31.743 31.743 0 0 0-3.339-.254v11.505a20.01 20.01 0 0 1 3.78.501.75.75 0 1 1-.339 1.462A18.558 18.558 0 0 0 10 17.5c-1.442 0-2.845.165-4.191.477a.75.75 0 0 1-.338-1.462 20.01 20.01 0 0 1 3.779-.501V4.509a31.743 31.743 0 0 0-3.339.254l1.77 7.85a.75.75 0 0 1-.387.83A4.98 4.98 0 0 1 5 14a4.98 4.98 0 0 1-2.294-.556.75.75 0 0 1-.387-.832L4.02 5.067c-.37.07-.738.148-1.103.232a.75.75 0 0 1-.336-1.462 33.186 33.186 0 0 1 6.668-.829V2.75A.75.75 0 0 1 10 2Z" clipRule="evenodd" />
    </svg>
  )
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439L3.5 3.16V2.75Z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}
