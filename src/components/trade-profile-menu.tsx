/** Profile sections for a trade (PRD 18 Profile). */
const SECTIONS: { href: string; label: string; note: string }[] = [
  { href: '/profile/business', label: 'Business details', note: 'Name, address, emails, VAT, invoice prefix, terms' },
  { href: '/profile/getting-paid', label: 'Getting paid', note: 'Bank details, bank connection, accounting, cards' },
  { href: '/profile/saved-items', label: 'Saved items', note: 'Lines you use often on quotes' },
  { href: '/profile/areas', label: 'Operating areas', note: 'Up to 20 districts, and Boosted Districts' },
  { href: '/profile/gallery', label: 'Photos', note: 'Gallery and featured jobs' },
  { href: '/profile/edit', label: 'Profile and trades', note: 'Your bio, trades and photo' },
  { href: '/profile/exports', label: 'Exports', note: 'Invoices, payments and credit notes for your accountant' },
  { href: '/subscription', label: 'Plan and billing', note: '£19.99 a month' },
]

export function TradeProfileMenu() {
  return (
    <nav aria-label="Profile sections" className="grid gap-2 sm:grid-cols-2">
      {SECTIONS.map(s => (
        <a key={s.href} href={s.href} className="flex min-h-[64px] flex-col justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-brand-amber">
          <span className="text-sm font-semibold text-brand-navy">{s.label}</span>
          <span className="text-xs text-gray-500">{s.note}</span>
        </a>
      ))}
    </nav>
  )
}
