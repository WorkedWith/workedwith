import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User, TradeProfile } from '@/types/database'

export const metadata = { title: 'Users — WorkedWith Admin' }

type PageProps = {
  searchParams: Promise<{ q?: string }>
}

type UserRow = Pick<User, 'id' | 'email' | 'full_name' | 'user_type' | 'verification_tier' | 'id_verification_status' | 'created_at' | 'is_admin'>
type TradeProfileRow = Pick<TradeProfile, 'user_id' | 'subscription_tier'>

export default async function UsersPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const admin = createAdminClient()

  let query = admin
    .from('users')
    .select('id, email, full_name, user_type, verification_tier, id_verification_status, created_at, is_admin')
    .order('created_at', { ascending: false })
    .limit(50)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data: rawUsers } = await query
  const users = (rawUsers ?? []) as unknown as UserRow[]

  // Subscription tier from trade_profiles for trade users
  const tradeUserIds = users.filter(u => u.user_type === 'trade').map(u => u.id)
  const { data: rawProfiles } = tradeUserIds.length
    ? await admin.from('trade_profiles').select('user_id, subscription_tier').in('user_id', tradeUserIds)
    : { data: [] }
  const tradeProfiles = (rawProfiles ?? []) as unknown as TradeProfileRow[]

  async function toggleAdmin(formData: FormData) {
    'use server'
    const userId = formData.get('userId') as string
    const newIsAdmin = formData.get('newIsAdmin') === 'true'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const adminClient = createAdminClient()
    const { data: caller } = await adminClient.from('users').select('is_admin').eq('id', user.id).single()
    if (!caller?.is_admin) return

    await adminClient.from('users').update({ is_admin: newIsAdmin }).eq('id', userId)
    revalidatePath('/admin/users')
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <form method="GET" className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search by name or email…"
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 transition-colors"
          >
            Search
          </button>
          {search && (
            <a href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700">Clear</a>
          )}
        </form>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">{search ? 'No users matched your search.' : 'No users found.'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name / Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Verification</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Subscription</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => {
                  const tradeProfile = tradeProfiles.find(tp => tp.user_id === user.id)
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={user.user_type} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          user.verification_tier === 'fully_verified'
                            ? 'text-green-700'
                            : user.verification_tier === 'phone_verified'
                            ? 'text-blue-600'
                            : 'text-gray-400'
                        }`}>
                          {user.verification_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {tradeProfile?.subscription_tier ?? (user.user_type === 'trade' ? 'free' : '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">
                          {new Date(user.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form action={toggleAdmin} className="inline">
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="newIsAdmin" value={(!user.is_admin).toString()} />
                          <button
                            type="submit"
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                              user.is_admin
                                ? 'bg-brand-amber/10 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {user.is_admin ? 'Admin' : 'User'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
            Showing {users.length} result{users.length === 1 ? '' : 's'}
            {search ? ` for "${search}"` : ' (most recent first, limit 50)'}
          </p>
        </div>
      )}
    </div>
  )
}

function TypeBadge({ type }: { type: string | null }) {
  const colours: Record<string, string> = {
    trade: 'bg-blue-50 text-blue-700',
    client_individual: 'bg-purple-50 text-purple-700',
    client_business: 'bg-indigo-50 text-indigo-700',
    both: 'bg-teal-50 text-teal-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colours[type ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
      {type ?? '—'}
    </span>
  )
}
