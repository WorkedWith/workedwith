/** Accounting platforms we sync to. Plain wordmarks until we have permission to use each brand's logo. */
const PLATFORMS = ['Xero', 'QuickBooks', 'FreeAgent', 'Sage']

export function AccountingLogos({ dark = false }: { dark?: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-3" aria-label="Accounting software we sync with">
      {PLATFORMS.map(p => (
        <li
          key={p}
          className={`rounded-xl border px-4 py-2 text-base font-bold tracking-tight ${dark ? 'border-white/20 text-white' : 'border-gray-200 bg-white text-brand-navy'}`}
        >
          {p}
        </li>
      ))}
    </ul>
  )
}
