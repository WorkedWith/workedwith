import { createAdminClient } from '@/lib/supabase/admin'
import type { SearchAuditLog, SearchAuditResult, User } from '@/types/database'

export const metadata = { title: 'Search Audit — WorkedWith Admin' }

const PAGE_SIZE = 20

type PageProps = {
  searchParams: Promise<{ page?: string; result?: string }>
}

type AuditRow = SearchAuditLog & {
  searcher: Pick<User, 'id' | 'email' | 'full_name'> | null
  isHeavy: boolean
}

const resultLabels: Record<SearchAuditResult, string> = {
  match_found: 'Match found',
  no_match: 'No match',
  rate_limited: 'Rate limited',
}

const resultColours: Record<SearchAuditResult, string> = {
  match_found: 'bg-green-50 text-green-700 border-green-100',
  no_match: 'bg-gray-100 text-gray-500 border-gray-200',
  rate_limited: 'bg-red-50 text-red-600 border-red-100',
}

export default async function SearchAuditPage({ searchParams }: PageProps) {
  const { page, result } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const resultFilter = (result as SearchAuditResult | undefined) ?? null
  const offset = (currentPage - 1) * PAGE_SIZE

  const admin = createAdminClient()

  // Main paginated query
  let query = admin
    .from('search_audit_log')
    .select('*')
    .order('searched_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (resultFilter) {
    query = query.eq('result', resultFilter)
  }

  // Count query for pagination
  let countQuery = admin
    .from('search_audit_log')
    .select('*', { count: 'exact', head: true })

  if (resultFilter) {
    countQuery = countQuery.eq('result', resultFilter)
  }

  const [{ data: rawLogs }, { count: totalCount }] = await Promise.all([query, countQuery])
  const logs = (rawLogs ?? []) as unknown as SearchAuditLog[]

  // Fetch searcher details
  const searcherIds = Array.from(new Set(logs.map(l => l.searcher_id).filter((id): id is string => id !== null)))
  const { data: rawUsers } = searcherIds.length
    ? await admin.from('users').select('id, email, full_name').in('id', searcherIds)
    : { data: [] }
  const users = (rawUsers ?? []) as Pick<User, 'id' | 'email' | 'full_name'>[]

  // Identify heavy users (>15 searches in last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentActivity } = await admin
    .from('search_audit_log')
    .select('searcher_id')
    .gte('searched_at', since)

  const searchCountByUser = new Map<string, number>()
  for (const row of recentActivity ?? []) {
    if (row.searcher_id) {
      searchCountByUser.set(row.searcher_id, (searchCountByUser.get(row.searcher_id) ?? 0) + 1)
    }
  }
  const heavySearchers = new Set(
    Array.from(searchCountByUser.entries())
      .filter(([, count]) => count > 15)
      .map(([id]) => id)
  )

  const rows: AuditRow[] = logs.map(log => ({
    ...log,
    searcher: users.find(u => u.id === log.searcher_id) ?? null,
    isHeavy: log.searcher_id ? heavySearchers.has(log.searcher_id) : false,
  }))

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE)

  function buildHref(p: number, r?: string | null) {
    const params = new URLSearchParams()
    params.set('page', String(p))
    if (r) params.set('result', r)
    return `/admin/search-audit?${params.toString()}`
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search Audit Log</h1>
          {heavySearchers.size > 0 && (
            <p className="mt-1 text-sm text-amber-600 font-medium">
              {heavySearchers.size} account{heavySearchers.size === 1 ? '' : 's'} with &gt;15 searches in the last 24h
            </p>
          )}
        </div>

        {/* Result filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          <a
            href={buildHref(1)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              !resultFilter ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </a>
          {(['match_found', 'no_match', 'rate_limited'] as SearchAuditResult[]).map(r => (
            <a
              key={r}
              href={buildHref(1, r)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                resultFilter === r
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : `${resultColours[r]} hover:opacity-80`
              }`}
            >
              {resultLabels[r]}
            </a>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">No log entries found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Searcher</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Result</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">When</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${row.isHeavy ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        {row.searcher ? (
                          <div className="flex items-center gap-2">
                            {row.isHeavy && (
                              <span className="shrink-0 h-2 w-2 rounded-full bg-amber-400" title=">15 searches in 24h" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{row.searcher.full_name}</p>
                              <p className="text-xs text-gray-400">{row.searcher.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Anonymous</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">{row.search_type ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {row.result ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${resultColours[row.result]}`}>
                            {resultLabels[row.result]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">
                          {new Date(row.searched_at).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 font-mono">{row.ip_address ?? '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Page {currentPage} of {totalPages} &mdash; {totalCount?.toLocaleString()} total
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <a
                    href={buildHref(currentPage - 1, resultFilter)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage < totalPages && (
                  <a
                    href={buildHref(currentPage + 1, resultFilter)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
