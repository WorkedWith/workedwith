import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Admin — WorkedWith' }

async function fetchCounts() {
  const admin = createAdminClient()

  const [
    { count: pendingVerifications },
    { count: openDisputes },
    { count: flaggedReviews },
    { count: totalUsers },
    { count: totalJobs },
    { count: totalReviews },
  ] = await Promise.all([
    admin.from('verification_documents').select('*', { count: 'exact', head: true }).eq('outcome', 'pending'),
    admin.from('disputes').select('*', { count: 'exact', head: true }).eq('admin_decision', 'pending'),
    admin.from('reviews').select('*', { count: 'exact', head: true }).eq('red_flag', true),
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('jobs').select('*', { count: 'exact', head: true }),
    admin.from('reviews').select('*', { count: 'exact', head: true }),
  ])

  return {
    pendingVerifications: pendingVerifications ?? 0,
    openDisputes: openDisputes ?? 0,
    flaggedReviews: flaggedReviews ?? 0,
    totalUsers: totalUsers ?? 0,
    totalJobs: totalJobs ?? 0,
    totalReviews: totalReviews ?? 0,
  }
}

export default async function AdminDashboard() {
  const counts = await fetchCounts()

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Overview</h1>

      {/* Action queues */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Action required</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QueueCard
            href="/admin/verification"
            label="Pending verifications"
            count={counts.pendingVerifications}
            urgent={counts.pendingVerifications > 0}
          />
          <QueueCard
            href="/admin/disputes"
            label="Open disputes"
            count={counts.openDisputes}
            urgent={counts.openDisputes > 0}
          />
          <QueueCard
            href="/admin/flags"
            label="Flagged reviews"
            count={counts.flaggedReviews}
            urgent={false}
          />
        </div>
      </div>

      {/* Platform stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Platform totals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total users" count={counts.totalUsers} href="/admin/users" />
          <StatCard label="Total jobs" count={counts.totalJobs} />
          <StatCard label="Total reviews" count={counts.totalReviews} />
        </div>
      </div>
    </div>
  )
}

function QueueCard({
  href,
  label,
  count,
  urgent,
}: {
  href: string
  label: string
  count: number
  urgent: boolean
}) {
  return (
    <a
      href={href}
      className={`rounded-2xl border p-5 flex flex-col gap-1 hover:shadow-md transition-shadow group ${
        urgent && count > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'
      }`}
    >
      <span className={`text-3xl font-bold ${urgent && count > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
        {count}
      </span>
      <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">{label}</span>
    </a>
  )
}

function StatCard({ label, count, href }: { label: string; count: number; href?: string }) {
  const inner = (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-1">
      <span className="text-3xl font-bold text-gray-900">{count.toLocaleString()}</span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  )
  if (href) return <a href={href} className="hover:shadow-md transition-shadow">{inner}</a>
  return inner
}
