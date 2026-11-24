/** "Boosted" label with the short explanation on tap (PRD 15). Works without JavaScript. */
export function BoostedBadge() {
  return (
    <details className="relative inline-block">
      <summary className="inline-flex min-h-[28px] cursor-pointer list-none items-center gap-1 rounded-full bg-brand-amber px-2.5 py-0.5 text-xs font-bold text-brand-navy [&::-webkit-details-marker]:hidden">
        Boosted <span aria-hidden="true">ⓘ</span>
      </summary>
      <p className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 text-xs font-normal text-gray-700 shadow-lg">
        This trade pays to appear here. Reviews and scores are never affected.
      </p>
    </details>
  )
}
