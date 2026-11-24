/** Filled in by phase 3 (quotes and jobs). */
export async function ClientJobsList({ userId }: { userId: string }) {
  void userId
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
      No jobs yet. When a trade sends you a quote it will appear here.
    </div>
  )
}
