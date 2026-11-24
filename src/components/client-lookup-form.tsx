/** Quick client lookup on the trade's home: exact email or mobile only (PRD 14). */
export function ClientLookupForm() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-sm font-semibold text-brand-navy">Look up a client</p>
      <p className="mb-4 text-xs text-gray-500">See their record from other trades before you quote.</p>
      <form method="GET" action="/search" className="space-y-3">
        <input name="q" type="text" required autoComplete="off" aria-label="Client email or mobile" placeholder="Their email or mobile"
          className="h-12 w-full rounded-lg border border-gray-200 px-3 text-base text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber" />
        <button type="submit" className="h-12 w-full rounded-lg bg-brand-amber px-4 text-sm font-bold text-brand-navy hover:bg-amber-400">Look up</button>
      </form>
    </div>
  )
}
