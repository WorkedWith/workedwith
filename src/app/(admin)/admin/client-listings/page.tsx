import { createAdminClient } from '@/lib/supabase/admin'
import type { ClientListingSubmission } from '@/types/database'
import { ListingReview } from './listing-review'

export const metadata = { title: 'Client added listings — WorkedWith Admin' }

export default async function ClientListingsPage() {
  const admin = createAdminClient()
  const { data } = await admin.from('client_listing_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: true })
  const rows = (data ?? []) as unknown as ClientListingSubmission[]

  const clientIds = Array.from(new Set(rows.map(r => r.client_id)))
  const { data: users } = clientIds.length ? await admin.from('users').select('id, full_name, email').in('id', clientIds) : { data: [] }
  const byId = new Map(((users ?? []) as unknown as { id: string; full_name: string; email: string | null }[]).map(u => [u.id, u]))

  // Earlier submissions by the same client, to spot someone using this to target a business
  const { data: past } = clientIds.length
    ? await admin.from('client_listing_submissions').select('client_id, status').in('client_id', clientIds).neq('status', 'pending')
    : { data: [] }
  const pastCounts = new Map<string, { rejected: number; total: number }>()
  for (const p of (past ?? []) as unknown as { client_id: string; status: string }[]) {
    const c = pastCounts.get(p.client_id) ?? { rejected: 0, total: 0 }
    c.total++
    if (p.status === 'rejected') c.rejected++
    pastCounts.set(p.client_id, c)
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Client added listings</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Oldest first. Check the business is real and trading, uses its business name only, is not a duplicate, and is not being used to target someone.
        Never add a phone number. Add an email only if it is genuinely public. {rows.length} waiting.
      </p>
      {rows.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Nothing waiting.</p>}
      <div className="space-y-4">
        {rows.map(r => {
          const u = byId.get(r.client_id)
          const pc = pastCounts.get(r.client_id)
          return (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500">
                Added by {u?.full_name ?? 'Unknown'} ({u?.email ?? 'no email'}) on {new Date(r.created_at).toLocaleDateString('en-GB')}
                {pc ? ` · ${pc.total} earlier, ${pc.rejected} rejected` : ''}
              </p>
              {r.public_reference_url && (
                <p className="mt-1 text-sm">
                  Public listing:{' '}
                  <a href={r.public_reference_url} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-700 underline break-all">{r.public_reference_url}</a>
                </p>
              )}
              <ListingReview id={r.id} name={r.business_name} trade={r.trade_category} district={r.district} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
