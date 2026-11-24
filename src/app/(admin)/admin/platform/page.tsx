import { createAdminClient } from '@/lib/supabase/admin'
import { rollingRevenuePence, VAT_THRESHOLD_PENCE } from '@/lib/admin/revenue'
import { formatPence } from '@/lib/money'

export const metadata = { title: 'Platform | Admin' }
export const dynamic = 'force-dynamic'

function Box({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <dl className="mt-2 divide-y divide-gray-100 text-sm">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-1.5"><dt className="text-gray-600">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
      </dl>
    </section>
  )
}

/** The quote to paid platform at a glance (PRD 18 admin, 23 item 7). */
export default async function PlatformAdminPage() {
  const admin = createAdminClient()
  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0
  const [issues, requested, chargebacks, refundDue, disputedPays, trades, bankRows, syncRows, windowsOpen, windowsClosed, seeded, seededViews, seededClicks] = await Promise.all([
    count(admin.from('stage_issues').select('id', { count: 'exact', head: true }).eq('status', 'open')),
    count(admin.from('payment_stages').select('id', { count: 'exact', head: true }).gte('requested_by_trade_at', d30)),
    count(admin.from('chargebacks').select('id', { count: 'exact', head: true }).is('closed_at', null)),
    count(admin.from('jobs').select('id', { count: 'exact', head: true }).eq('deposit_outcome', 'refund_due')),
    count(admin.from('payments').select('id', { count: 'exact', head: true }).not('client_disputed_at', 'is', null)),
    admin.from('trade_profiles').select('subscription_status, trial_ends_at'),
    admin.from('trade_bank_accounts').select('connection_status'),
    admin.from('accounting_sync_items').select('status, connection_id'),
    count(admin.from('review_windows').select('id', { count: 'exact', head: true }).eq('flow', 'quote').is('closed_at', null)),
    count(admin.from('review_windows').select('id', { count: 'exact', head: true }).eq('flow', 'quote').gte('closed_at', d30)),
    admin.from('seeded_profiles').select('status, initial_invite_sent_at, reminder_1_sent_at, reminder_2_sent_at, reminder_3_sent_at, companies_house_status'),
    count(admin.from('seeded_profile_views').select('id', { count: 'exact', head: true }).gte('created_at', d30)),
    count(admin.from('profile_contact_clicks').select('id', { count: 'exact', head: true }).not('seeded_profile_id', 'is', null).gte('created_at', d30)),
  ])
  const { data: conns } = await admin.from('accounting_connections').select('id, platform, status')
  const platformOf = new Map((conns ?? []).map(c => [c.id as string, c.platform as string]))
  const byPlatform = new Map<string, { synced: number; pending: number; failed: number }>()
  for (const r of syncRows.data ?? []) {
    const p = platformOf.get(r.connection_id as string) ?? 'disconnected'
    const b = byPlatform.get(p) ?? { synced: 0, pending: 0, failed: 0 }
    b[r.status as 'synced' | 'pending' | 'failed']++
    byPlatform.set(p, b)
  }
  const statusCount = (s: string) => (trades.data ?? []).filter(t => t.subscription_status === s).length
  const active = statusCount('active')
  const revenue = await rollingRevenuePence(active)
  const bankCount = (s: string) => (bankRows.data ?? []).filter(b => b.connection_status === s).length
  const month = new Date().toISOString().slice(0, 7) + '-01'
  const { data: usage } = await admin.from('open_banking_usage').select('connection_active, data_refreshes').eq('month', month)
  const costPer = Number(process.env.OPEN_BANKING_COST_PER_CONNECTION_PENCE ?? '0')
  const seededRows = seeded.data ?? []

  // Quotes sent, accepted and paid per week (last 8 weeks)
  const since = new Date(Date.now() - 56 * 86_400_000).toISOString()
  const { data: qs } = await admin.from('quotes').select('sent_at, accepted_at').gte('created_at', since)
  const { data: paidJobs } = await admin.from('jobs').select('updated_at').eq('flow', 'quote').eq('status', 'paid').gte('updated_at', since)
  const week = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / (7 * 86_400_000))
  const weeks = Array.from({ length: 8 }, (_, i) => ({
    label: i === 0 ? 'This week' : `${i} ${i === 1 ? 'week' : 'weeks'} ago`,
    sent: (qs ?? []).filter(q => q.sent_at && week(q.sent_at as string) === i).length,
    accepted: (qs ?? []).filter(q => q.accepted_at && week(q.accepted_at as string) === i).length,
    paid: (paidJobs ?? []).filter(j => week(j.updated_at as string) === i).length,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Box title="Plans" rows={[['Trialing', statusCount('trialing')], ['Active', active], ['Lapsed', statusCount('lapsed')], ['Cancelled', statusCount('cancelled')], ['Rolling 12 month revenue', `${formatPence(revenue.pence)}${revenue.estimated ? ' (estimate)' : ''}`], ['VAT threshold', `${Math.round((revenue.pence / VAT_THRESHOLD_PENCE) * 100)}% of £90,000`]]} />
        <Box title="Jobs needing attention" rows={[['Open stage issues', issues], ['Payment requested by trade (30 days)', requested], ['Open chargebacks', chargebacks], ['Deposit refunds due', refundDue], ['Payments the client disputes', disputedPays]]} />
        <Box title="Bank connections" rows={[['Connected', bankCount('connected')], ['Reconfirm due', bankCount('needs_reconfirm')], ['Lapsed', bankCount('lapsed')], ['Bank not supported', bankCount('unsupported')], ['Not connected', bankCount('not_connected')], ['Connected this month', (usage ?? []).filter(u => u.connection_active).length], ['Data refreshes this month', (usage ?? []).reduce((t, u) => t + (u.data_refreshes as number), 0)], ['Estimated cost this month', formatPence((usage ?? []).filter(u => u.connection_active).length * costPer)]]} />
        <Box title="Accounting sync" rows={Array.from(byPlatform.entries()).map(([p, b]) => [p, `${b.synced} synced, ${b.pending} waiting, ${b.failed} failed`] as [string, string])} />
        <Box title="Reviews" rows={[['Windows open', windowsOpen], ['Windows closed (30 days)', windowsClosed]]} />
        <Box title="Seeded outreach" rows={[['Unclaimed listings', seededRows.filter(s => s.status === 'unclaimed').length], ['Active limited companies', seededRows.filter(s => s.companies_house_status === 'active').length], ['First email sent', seededRows.filter(s => s.initial_invite_sent_at).length], ['Day 30 / 60 / 80 sent', `${seededRows.filter(s => s.reminder_1_sent_at).length} / ${seededRows.filter(s => s.reminder_2_sent_at).length} / ${seededRows.filter(s => s.reminder_3_sent_at).length}`], ['Claimed', seededRows.filter(s => s.status === 'claimed').length], ['Seeded views (30 days)', seededViews], ['Seeded Email now clicks (30 days)', seededClicks]]} />
      </div>
      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500"><tr><th className="px-4 py-2">Week</th><th className="px-4 py-2">Quotes sent</th><th className="px-4 py-2">Accepted</th><th className="px-4 py-2">Jobs paid</th></tr></thead>
          <tbody>{weeks.map(w => <tr key={w.label} className="border-t border-gray-100"><td className="px-4 py-2">{w.label}</td><td className="px-4 py-2">{w.sent}</td><td className="px-4 py-2">{w.accepted}</td><td className="px-4 py-2">{w.paid}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  )
}
