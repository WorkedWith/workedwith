export default function FindLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <div className="bg-brand-navy px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="h-5 w-28 rounded bg-white/10 animate-pulse" />
          <div className="mt-4 h-10 w-72 rounded-lg bg-white/15 animate-pulse" />
          <div className="mt-3 h-4 w-96 rounded bg-white/10 animate-pulse" />
          <div className="mt-8 h-16 w-full rounded-2xl bg-white/10 animate-pulse" />
        </div>
      </div>

      {/* Results skeleton */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-gray-100 bg-gray-100 h-32"
          />
        ))}
      </div>
    </div>
  )
}
