export default function FindLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-navy px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="h-8 w-48 rounded-lg bg-white/10 animate-pulse" />
          <div className="mt-2 h-4 w-72 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 h-36"
          />
        ))}
      </div>
    </div>
  )
}
