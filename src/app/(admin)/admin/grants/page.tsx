import { createAdminClient } from '@/lib/supabase/admin'
import { GRANT_REASON_LABEL, PLAN_NAME } from '@/lib/grants'
import {
  createGrantAction,
  giveFoundingOfferAction,
  extendGrantAction,
  changeGrantTierAction,
  endGrantEarlyAction,
} from '@/actions/admin/grants'
import type { TierGrant } from '@/types/database'

export const metadata = { title: 'Plan grants — WorkedWith Admin' }

type PageProps = {
  searchParams: Promise<{ notice?: string; error?: string; email?: string }>
}

type UserInfo = { id: string; email: string | null; full_name: string | null }

const input =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber'
const btn =
  'rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90 transition-colors'
const btnGhost =
  'rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors'

function fmt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function dateInput(iso: string): string {
  return iso.slice(0, 10)
}

export default async function GrantsPage({ searchParams }: PageProps) {
  const { notice, error, email } = await searchParams
  const admin = createAdminClient()
  const now = new Date()

  const { data: rawGrants } = await admin
    .from('tier_grants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  const grants = (rawGrants ?? []) as unknown as TierGrant[]
  const open = grants.filter(g => !g.ended_at)
  const ended = grants.filter(g => g.ended_at)

  const userIds = Array.from(new Set(grants.map(g => g.user_id)))
  const { data: rawUsers } = userIds.length
    ? await admin.from('users').select('id, email, full_name').in('id', userIds)
    : { data: [] }
  const users = new Map(((rawUsers ?? []) as unknown as UserInfo[]).map(u => [u.id, u]))

  // Did people with ended grants go on to pay?
  const endedUserIds = Array.from(new Set(ended.map(g => g.user_id)))
  const { data: rawPaid } = endedUserIds.length
    ? await admin.from('trade_profiles').select('user_id, subscription_tier').in('user_id', endedUserIds)
    : { data: [] }
  const paidNow = new Map(
    ((rawPaid ?? []) as unknown as { user_id: string; subscription_tier: string | null }[]).map(r => [
      r.user_id,
      !!r.subscription_tier && r.subscription_tier !== 'free',
    ]),
  )
  const conversion = new Map<string, { ended: number; paid: number }>()
  for (const g of ended) {
    const row = conversion.get(g.reason) ?? { ended: 0, paid: 0 }
    row.ended++
    if (paidNow.get(g.user_id)) row.paid++
    conversion.set(g.reason, row)
  }

  // Founding offer helper: claimed trades with a completed profile, 5+ backdated jobs, never had a grant
  const everGranted = new Set(grants.map(g => g.user_id))
  const { data: rawProfiles } = await admin
    .from('trade_profiles')
    .select('id, user_id, bio, operating_areas, company_name, subscription_tier')
    .not('bio', 'is', null)
    .limit(1000)
  const completed = ((rawProfiles ?? []) as unknown as {
    id: string; user_id: string; bio: string | null; operating_areas: string[] | null; company_name: string | null; subscription_tier: string | null
  }[]).filter(p => (p.bio ?? '').trim().length > 0 && (p.operating_areas ?? []).length > 0 && !everGranted.has(p.user_id))

  const backdatedCounts = new Map<string, number>()
  if (completed.length > 0) {
    const { data: rawJobs } = await admin
      .from('jobs')
      .select('trade_profile_id')
      .eq('is_backdated', true)
      .neq('status', 'cancelled')
      .in('trade_profile_id', completed.map(p => p.id))
    for (const j of (rawJobs ?? []) as unknown as { trade_profile_id: string | null }[]) {
      if (!j.trade_profile_id) continue
      backdatedCounts.set(j.trade_profile_id, (backdatedCounts.get(j.trade_profile_id) ?? 0) + 1)
    }
  }
  const eligibleBase = completed
    .map(p => ({ ...p, backdated: backdatedCounts.get(p.id) ?? 0 }))
    .filter(p => p.backdated >= 5 && (!p.subscription_tier || p.subscription_tier === 'free'))
    .sort((a, b) => b.backdated - a.backdated)
    .slice(0, 50)
  const { data: rawEligibleUsers } = eligibleBase.length
    ? await admin.from('users').select('id, email, full_name').in('id', eligibleBase.map(p => p.user_id))
    : { data: [] }
  const eligibleUsers = new Map(((rawEligibleUsers ?? []) as unknown as UserInfo[]).map(u => [u.id, u]))

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plan grants</h1>
        <p className="mt-1 text-sm text-gray-500">
          Give a trade Standard or Pro free for a set time. No card, no Stripe. One grant per trade at a time.
        </p>
      </div>

      {notice && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{notice}</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {/* ── Create ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">New grant</h2>
        <form action={createGrantAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">Trade’s email</span>
            <input name="email" type="email" required defaultValue={email ?? ''} className={`${input} w-full`} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Plan</span>
            <select name="tier" className={`${input} w-full`} defaultValue="standard">
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Reason</span>
            <select name="reason" className={`${input} w-full`} defaultValue="founding">
              {Object.entries(GRANT_REASON_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <fieldset className="text-sm">
            <legend className="mb-1 font-medium text-gray-700">Starts</legend>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5"><input type="radio" name="startMode" value="now" defaultChecked /> Now</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="startMode" value="date" /> On</label>
              <input name="startDate" type="date" className={input} />
            </div>
          </fieldset>
          <fieldset className="text-sm">
            <legend className="mb-1 font-medium text-gray-700">Ends</legend>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5"><input type="radio" name="endMode" value="months" defaultChecked />
                <select name="months" className={input} defaultValue="6">
                  <option value="1">1 month</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5"><input type="radio" name="endMode" value="date" /> On</label>
              <input name="endDate" type="date" className={input} />
            </div>
          </fieldset>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">Private note (admin only)</span>
            <input name="note" maxLength={500} className={`${input} w-full`} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={btn}>Give plan</button>
          </div>
        </form>
      </section>

      {/* ── Open grants ────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Active and scheduled ({open.length})</h2>
        {open.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No open grants.</p>
        ) : (
          <div className="space-y-3">
            {open.map(g => {
              const u = users.get(g.user_id)
              const scheduled = new Date(g.starts_at) > now
              return (
                <div key={g.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{u?.full_name ?? 'Unknown'} <span className="font-normal text-gray-400">{u?.email}</span></p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {PLAN_NAME[g.tier]} · {GRANT_REASON_LABEL[g.reason] ?? g.reason} · {fmt(g.starts_at)} to {fmt(g.ends_at)}
                      </p>
                      {g.note && <p className="mt-1 text-xs text-gray-400">Note: {g.note}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scheduled ? 'bg-blue-50 text-blue-700' : 'bg-green-100 text-green-800'}`}>
                      {scheduled ? 'Scheduled' : 'Active'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
                    <form action={extendGrantAction} className="flex items-end gap-2">
                      <input type="hidden" name="grantId" value={g.id} />
                      <label className="text-xs text-gray-500">New end date
                        <input name="endDate" type="date" required defaultValue={dateInput(g.ends_at)} className={`${input} mt-1 block`} />
                      </label>
                      <button type="submit" className={btnGhost}>Change end date</button>
                    </form>
                    <form action={changeGrantTierAction} className="flex items-end gap-2">
                      <input type="hidden" name="grantId" value={g.id} />
                      <label className="text-xs text-gray-500">Plan
                        <select name="tier" defaultValue={g.tier} className={`${input} mt-1 block`}>
                          <option value="standard">Standard</option>
                          <option value="pro">Pro</option>
                        </select>
                      </label>
                      <button type="submit" className={btnGhost}>Change plan</button>
                    </form>
                    <form action={endGrantEarlyAction}>
                      <input type="hidden" name="grantId" value={g.id} />
                      <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">End now</button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Founding offer helper ──────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-gray-900">Eligible for the founding offer ({eligibleBase.length})</h2>
        <p className="mb-3 text-xs text-gray-500">
          Claimed trades on Free with a bio, operating areas and at least 5 backdated jobs logged, who have never had a grant.
          One click gives 6 months of Standard. You still decide who gets it.
        </p>
        {eligibleBase.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Nobody qualifies yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {eligibleBase.map(p => {
              const u = eligibleUsers.get(p.user_id)
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u?.full_name ?? 'Unknown'} <span className="font-normal text-gray-400">{u?.email}</span></p>
                    <p className="text-xs text-gray-500">{p.company_name ?? 'No business name'} · {p.backdated} backdated jobs</p>
                  </div>
                  <form action={giveFoundingOfferAction}>
                    <input type="hidden" name="userId" value={p.user_id} />
                    <button type="submit" className={btn}>Give founding offer</button>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Ended + conversion ─────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Ended grants ({ended.length})</h2>
        {conversion.size > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {Array.from(conversion.entries()).map(([reason, c]) => (
              <div key={reason} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{GRANT_REASON_LABEL[reason] ?? reason}</p>
                <p className="mt-1 text-sm text-gray-900">{c.paid} of {c.ended} now paying</p>
              </div>
            ))}
          </div>
        )}
        {ended.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">None yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Trade</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Ran</th>
                    <th className="px-4 py-3">Ended</th>
                    <th className="px-4 py-3">Paying now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ended.slice(0, 100).map(g => {
                    const u = users.get(g.user_id)
                    return (
                      <tr key={g.id}>
                        <td className="px-4 py-3"><p className="font-medium text-gray-900">{u?.full_name ?? 'Unknown'}</p><p className="text-xs text-gray-400">{u?.email}</p></td>
                        <td className="px-4 py-3 text-gray-600">{PLAN_NAME[g.tier]}</td>
                        <td className="px-4 py-3 text-gray-600">{GRANT_REASON_LABEL[g.reason] ?? g.reason}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmt(g.starts_at)} to {fmt(g.ends_at)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{g.ended_reason?.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-xs">{paidNow.get(g.user_id) ? <span className="font-semibold text-green-700">Yes</span> : <span className="text-gray-400">No</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
