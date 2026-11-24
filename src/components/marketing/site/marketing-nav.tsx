'use client'

import { useState } from 'react'

const LINKS = [
  { href: '/for-trades', label: 'For trades' },
  { href: '/for-clients', label: 'For clients' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/find', label: 'Find a trade' },
]

/** Top bar for every marketing page. Collapses to a menu button on phones. */
export function MarketingNav({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const text = dark ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-brand-navy'
  return (
    <nav className={`sticky top-0 z-40 px-4 py-3 sm:px-6 ${dark ? 'bg-brand-navy' : 'border-b border-gray-100 bg-white/95 backdrop-blur'}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <a href="/" className={`text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-brand-navy'}`}>
          Worked<span className="text-brand-amber">With</span>
        </a>
        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map(l => (
            <a key={l.href} href={l.href} className={`flex min-h-[44px] items-center px-3 text-sm font-medium ${text}`}>{l.label}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a href="/sign-in" className={`hidden min-h-[44px] items-center px-3 text-sm font-medium sm:flex ${text}`}>Sign in</a>
          <a href="/join/trade" className="flex min-h-[44px] items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400">
            Start free trial
          </a>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label="Menu"
            className={`flex h-11 w-11 items-center justify-center rounded-lg lg:hidden ${dark ? 'text-white hover:bg-white/10' : 'text-brand-navy hover:bg-gray-100'}`}
          >
            <span aria-hidden="true" className="text-xl">{open ? '×' : '≡'}</span>
          </button>
        </div>
      </div>
      {open && (
        <div className={`mx-auto mt-2 max-w-6xl border-t pt-2 lg:hidden ${dark ? 'border-white/10' : 'border-gray-100'}`}>
          {[...LINKS, { href: '/sign-in', label: 'Sign in' }].map(l => (
            <a key={l.href} href={l.href} className={`flex min-h-[48px] items-center px-1 text-base font-medium ${text}`}>{l.label}</a>
          ))}
        </div>
      )}
    </nav>
  )
}
