export function ClientLookupForm() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-brand-navy mb-1">Look up a client</p>
      <p className="text-xs text-gray-500 mb-4">Ask your client for their WorkedWith username before you quote.</p>
      <form method="GET" action="/search" className="space-y-3">
        <div>
          <label htmlFor="dashboard-username" className="block text-xs font-medium text-gray-600 mb-1.5">
            Client username
          </label>
          <input
            id="dashboard-username"
            name="username"
            type="text"
            required
            placeholder="Enter their WorkedWith username"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          />
        </div>
        <button
          type="submit"
          className="h-11 w-full rounded-lg bg-brand-amber px-4 text-sm font-bold text-brand-navy hover:bg-amber-400 transition-colors"
        >
          Search
        </button>
      </form>
    </div>
  )
}
