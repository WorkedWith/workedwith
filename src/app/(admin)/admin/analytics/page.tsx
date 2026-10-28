import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveFocusDistricts } from '@/actions/admin/analytics-settings'
import { TRADE_TYPES } from '@/lib/trade-types'

export const metadata = { title: 'Search analytics — WorkedWith Admin' }

type PageProps = { searchParams: Promise<{ days?: string; district?: string; trade?: string; role?: string }> }

type Ev = { id: string; created_at: string; district: string; trade_category: string; viewer_role: string; session_hash: string; real_count: number }
type Out = { kind: string; created_at: string; district: string | null; trade_category: string | null; viewer_role: string | null; search_event_id: string | null }

const DAY = 86_400_000
const GAP_BELOW = 3
const DEMAND_ROLES = ['logged_out', 'client']

function pct(n: number, d: number): string {
  return d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`
}

function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = (x.getUTCDay() + 6) % 7
  x.setUTCDate(x.getUTCDate() - day)
  return x.toISOString().slice(0, 10)
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const days = [7, 30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 30
  const roleView = sp.role === 'trade' ? 'trade' : 'demand'
  const district = (sp.district ?? '').trim().toUpperCase()
  const trade = sp.trade ?? ''
  const admin = createAdminClient()
  const now = Date.now()

  const [{ data: setting }, { data: rawEv }, { data: rawOut }, { data: rawTrades }] = await Promise.all([
    admin.from('admin_settings').select('value').eq('key', 'focus_districts').maybeSingle(),
    admin.from('search_events').select('id, created_at, district, trade_category, viewer_role, session_hash, real_count')
      .gte('created_at', new Date(now - Math.max(days, 84) * DAY).toISOString()).neq('viewer_role', 'admin').order('created_at', { ascending: false }).limit(50000),
    admin.from('search_outcomes').select('kind, created_at, district, trade_category, viewer_role, search_event_id')
      .gte('created_at', new Date(now - Math.max(days, 84) * DAY).toISOString()).order('created_at', { ascending: false }).limit(50000),
    admin.from('trade_profiles').select('trade_types, operating_areas'),
  ])
  const focus = ((setting?.value as string[] | undefined) ?? ['WA14', 'WA15'])
  const allEv = (rawEv ?? []) as unknown as Ev[]
  const allOut = (rawOut ?? []) as unknown as Out[]

  const inRole = (r: string | null) => (roleView === 'trade' ? r === 'trade' : r !== null && DEMAND_ROLES.includes(r))
  const ev = allEv.filter(e => inRole(e.viewer_role))
  const out = allOut.filter(o => inRole(o.viewer_role))

  // Real claimed trades per district + category (counted once per profile)
  const claimed = new Map<string, number>()
  for (const t of (rawTrades ?? []) as unknown as { trade_types: string[]; operating_areas: string[] }[]) {
    const cats = new Set(t.trade_types ?? [])
    for (const a of t.operating_areas ?? []) for (const c of Array.from(cats)) claimed.set(`${a}|${c}`, (claimed.get(`${a}|${c}`) ?? 0) + 1)
  }

  const windowStart = now - days * DAY
  const prevStart = now - 2 * days * DAY
  const inWindow = (iso: string) => new Date(iso).getTime() >= windowStart
  const inPrev = (iso: string) => new Date(iso).getTime() >= prevStart && new Date(iso).getTime() < windowStart

  function headline(districts: string[]) {
    const f = (list: Ev[]) => list.filter(e => districts.includes(e.district))
    const cur = f(ev.filter(e => inWindow(e.created_at)))
    const prev = f(ev.filter(e => inPrev(e.created_at)))
    const clicks = out.filter(o => o.kind === 'contact_click' && o.district && districts.includes(o.district) && inWindow(o.created_at)).length
    return {
      searches: cur.length, prevSearches: prev.length,
      unique: new Set(cur.map(e => e.session_hash)).size,
      clicks,
      gaps: cur.filter(e => e.real_count < GAP_BELOW).length,
    }
  }
  const h = headline(focus)

  // Weekly trend, last 12 weeks, per focus district
  const weeks: string[] = []
  for (let i = 11; i >= 0; i--) weeks.push(weekStart(new Date(now - i * 7 * DAY)))
  const trend = new Map<string, number>()
  for (const e of ev) {
    if (!focus.includes(e.district)) continue
    const k = `${weekStart(new Date(e.created_at))}|${e.district}`
    trend.set(k, (trend.get(k) ?? 0) + 1)
  }
  const trendMax = Math.max(1, ...Array.from(trend.values()))

  // Breakdown
  const filtered = ev.filter(e => inWindow(e.created_at) && (!district || e.district === district) && (!trade || e.trade_category === trade))
  const evById = new Set(filtered.map(e => e.id))
  const rows = new Map<string, { district: string; category: string; searches: number; sessions: Set<string>; realSum: number; gaps: number; views: number; clicks: number }>()
  for (const e of filtered) {
    const k = `${e.district}|${e.trade_category}`
    const r = rows.get(k) ?? { district: e.district, category: e.trade_category, searches: 0, sessions: new Set<string>(), realSum: 0, gaps: 0, views: 0, clicks: 0 }
    r.searches++; r.sessions.add(e.session_hash); r.realSum += e.real_count; if (e.real_count < GAP_BELOW) r.gaps++
    rows.set(k, r)
  }
  for (const o of out) {
    if (!inWindow(o.created_at) || !o.district || !o.trade_category) continue
    if (district && o.district !== district) continue
    if (trade && o.trade_category !== trade) continue
    const r = rows.get(`${o.district}|${o.trade_category}`)
    if (!r) continue
    if (o.kind === 'profile_view') r.views++
    else r.clicks++
  }
  void evById
  const table = Array.from(rows.values()).sort((a, b) => b.searches - a.searches)

  const totals = {
    searches: filtered.length,
    views: table.reduce((s, r) => s + r.views, 0),
    clicks: table.reduce((s, r) => s + r.clicks, 0),
  }

  const gapRows = table
    .map(r => ({ ...r, trades: claimed.get(`${r.district}|${r.category}`) ?? 0 }))
    .filter(r => r.trades < GAP_BELOW)
  const expansion = table.filter(r => !focus.includes(r.district))
  const expansionByDistrict = new Map<string, number>()
  for (const r of expansion) expansionByDistrict.set(r.district, (expansionByDistrict.get(r.district) ?? 0) + r.searches)
  const expansionList = Array.from(expansionByDistrict.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const q = (over: Record<string, string>) => {
    const p = new URLSearchParams({ days: String(days), role: roleView, ...(district ? { district } : {}), ...(trade ? { trade } : {}), ...over })
    return `/admin/analytics?${p.toString()}`
  }
  const change = h.prevSearches === 0 ? (h.searches > 0 ? 'new' : '0') : `${h.searches >= h.prevSearches ? '+' : ''}${Math.round(((h.searches - h.prevSearches) / h.prevSearches) * 100)}%`

  const chip = (active: boolean) => `rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy">Search analytics</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every search on Find, and what happens next. Admin searches are excluded. {roleView === 'demand' ? 'Showing logged out visitors and clients.' : 'Showing searches by trades only.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={q({ role: 'demand' })} className={chip(roleView === 'demand')}>Demand (clients)</Link>
        <Link href={q({ role: 'trade' })} className={chip(roleView === 'trade')}>Trades</Link>
        <span className="mx-1 text-gray-300">|</span>
        {[7, 30, 90, 365].map(d => <Link key={d} href={q({ days: String(d) })} className={chip(days === d)}>{d === 365 ? '12 months' : `${d} days`}</Link>)}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Focus districts: {focus.join(', ')} (last {days} days)</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Searches', value: String(h.searches), sub: `${change} vs previous ${days} days` },
            { label: 'Unique searchers', value: String(h.unique), sub: 'by daily hash' },
            { label: 'Contact clicks', value: String(h.clicks), sub: 'Call or Email tapped' },
            { label: 'Gap rate', value: pct(h.gaps, h.searches), sub: `${h.gaps} searches with under ${GAP_BELOW} real trades` },
          ].map(c => (
            <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-brand-navy">{c.value}</p>
              <p className="mt-1 text-xs text-gray-500">{c.sub}</p>
            </div>
          ))}
        </div>
        <form action={saveFocusDistricts} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="districts" className="text-gray-600">Focus districts</label>
          <input id="districts" name="districts" defaultValue={focus.join(', ')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Save</button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Searches per week, last 12 weeks</h2>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500"><th className="pb-2 pr-4">Week of</th>{focus.map(f => <th key={f} className="pb-2 pr-4">{f}</th>)}</tr></thead>
            <tbody>
              {weeks.map(w => (
                <tr key={w} className="border-t border-gray-100">
                  <td className="py-1.5 pr-4 text-gray-600">{new Date(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  {focus.map(f => {
                    const n = trend.get(`${w}|${f}`) ?? 0
                    return (
                      <td key={f} className="py-1.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded bg-brand-amber" style={{ width: `${Math.round((n / trendMax) * 80)}px` }} />
                          <span className="text-xs text-gray-700">{n}</span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Funnel (last {days} days{district ? `, ${district}` : ''}{trade ? `, ${trade}` : ''})</h2>
        <p className="mt-2 text-sm text-gray-700">
          {totals.searches} searches → {totals.views} profile views ({pct(totals.views, totals.searches)}) → {totals.clicks} contact clicks ({pct(totals.clicks, totals.views)} of views)
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Breakdown</h2>
        <form className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="days" value={days} />
          <input type="hidden" name="role" value={roleView} />
          <input name="district" defaultValue={district} placeholder="District e.g. WA15" className="rounded-lg border border-gray-300 px-3 py-1.5" />
          <select name="trade" defaultValue={trade} className="rounded-lg border border-gray-300 px-3 py-1.5">
            <option value="">All trades</option>
            {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="rounded-lg bg-brand-navy px-4 py-1.5 text-xs font-semibold text-white">Filter</button>
        </form>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500">
              <th className="p-3">District</th><th className="p-3">Trade</th><th className="p-3">Searches</th><th className="p-3">Unique</th>
              <th className="p-3">Avg real trades</th><th className="p-3">Gap rate</th><th className="p-3">Views</th><th className="p-3">Clicks</th>
            </tr></thead>
            <tbody>
              {table.length === 0 && <tr><td colSpan={8} className="p-4 text-gray-500">No searches in this period yet.</td></tr>}
              {table.map(r => (
                <tr key={`${r.district}|${r.category}`} className="border-t border-gray-100">
                  <td className="p-3 font-semibold">{r.district}</td><td className="p-3">{r.category}</td><td className="p-3">{r.searches}</td>
                  <td className="p-3">{r.sessions.size}</td><td className="p-3">{(r.realSum / r.searches).toFixed(1)}</td>
                  <td className="p-3">{pct(r.gaps, r.searches)}</td><td className="p-3">{r.views}</td><td className="p-3">{r.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Gap report: recruit or seed here</h2>
          <p className="mt-1 text-xs text-gray-500">Searched for, but fewer than {GAP_BELOW} claimed trades cover it today.</p>
          <ul className="mt-2 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {gapRows.length === 0 && <li className="p-4 text-sm text-gray-500">No gaps in this period.</li>}
            {gapRows.slice(0, 15).map(r => (
              <li key={`${r.district}|${r.category}`} className="flex items-center justify-between p-3 text-sm">
                <span><span className="font-semibold">{r.district}</span> {r.category}</span>
                <span className="text-xs text-gray-500">{r.searches} searches · {r.trades} trade{r.trades === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Expansion: where to go next</h2>
          <p className="mt-1 text-xs text-gray-500">Districts outside your focus, by searches.</p>
          <ul className="mt-2 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {expansionList.length === 0 && <li className="p-4 text-sm text-gray-500">Nothing outside the focus districts yet.</li>}
            {expansionList.map(([d, n]) => (
              <li key={d} className="flex items-center justify-between p-3 text-sm"><span className="font-semibold">{d}</span><span className="text-xs text-gray-500">{n} searches</span></li>
            ))}
          </ul>
        </div>
      </section>
      <p className="mt-6 text-xs text-gray-400">Latest 50,000 events are read. Anything older than 12 months is rolled up into weekly totals and the raw rows are deleted.</p>
    </div>
  )
}
