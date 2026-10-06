import { createAdminClient } from '@/lib/supabase/admin'
import type { PendingInvite, User } from '@/types/database'

export const metadata = { title: 'Pending Invites — WorkedWith Admin' }

type InviteRow = PendingInvite & {
  client_name: string
  client_email: string
  claimer_name: string | null
}

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  sent:     { label: 'Sent',     classes: 'bg-blue-100 text-blue-700' },
  expired:  { label: 'Expired',  classes: 'bg-gray-100 text-gray-500' },
  claimed:  { label: 'Claimed',  classes: 'bg-green-100 text-green-700' },
  disputed: { label: 'Disputed', classes: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, classes: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.classes}`}>
      {s.label}
    </span>
  )
}

export default async function PendingInvitesPage() {
  const admin = createAdminClient()

  const { data: rawInvites } = await admin
    .from('pending_invites')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const invites = (rawInvites ?? []) as unknown as PendingInvite[]

  if (invites.length === 0) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Pending Invites</h1>
        <p className="text-sm text-gray-500">No client-initiated trade invites yet.</p>
      </div>
    )
  }

  // Fetch all involved users in parallel
  const clientIds = Array.from(new Set(invites.map(i => i.inviting_client_id)))
  const claimerIds = Array.from(new Set(invites.map(i => i.claimed_by_user_id).filter((id): id is string => !!id)))

  const userIdsToFetch = Array.from(new Set([...clientIds, ...claimerIds]))
  const { data: rawUsers } = await admin.from('users').select('id, full_name, email').in('id', userIdsToFetch)
  const users = (rawUsers ?? []) as Pick<User, 'id' | 'full_name' | 'email'>[]

  const enriched: InviteRow[] = invites.map(inv => {
    const client = users.find(u => u.id === inv.inviting_client_id)
    const claimer = inv.claimed_by_user_id ? users.find(u => u.id === inv.claimed_by_user_id) : null
    return {
      ...inv,
      client_name: client?.full_name ?? '—',
      client_email: client?.email ?? '—',
      claimer_name: claimer?.full_name ?? null,
    }
  })

  // Summary counts
  const counts = enriched.reduce(
    (acc, inv) => { acc[inv.status] = (acc[inv.status] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pending Invites</h1>
        <p className="mt-1 text-sm text-gray-500">
          Client-initiated trade claim invites — most recent first.
        </p>
      </div>

      {/* Summary pills */}
      <div className="mb-6 flex flex-wrap gap-3">
        {(['sent', 'claimed', 'disputed', 'expired'] as const).map(s => (
          <div key={s} className="flex items-center gap-2">
            <StatusBadge status={s} />
            <span className="text-sm text-gray-600">{counts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Sent', 'Client', 'Trade name', 'Job type', 'Job date', 'Contact', 'Status', 'Claimed by', 'Expires'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enriched.map(inv => (
              <tr key={inv.id} className={inv.status === 'disputed' ? 'bg-red-50' : ''}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{inv.client_name}</p>
                  <p className="text-xs text-gray-400">{inv.client_email}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{inv.trade_name}</td>
                <td className="px-4 py-3 text-gray-700">{inv.job_type}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{inv.job_date}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {inv.contact_email && <div>{inv.contact_email}</div>}
                  {inv.contact_phone && <div>{inv.contact_phone}</div>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {inv.claimer_name ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
