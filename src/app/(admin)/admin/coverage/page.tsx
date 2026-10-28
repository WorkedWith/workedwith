import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES, parentTrade } from '@/lib/trade-types'

export const metadata = { title: 'Trade coverage — WorkedWith Admin' }

type PageProps = { searchParams: Promise<{ district?: string; trade?: string; area?: string }> }

export default async function CoveragePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const district = (sp.district ?? '').trim().toUpperCase()
  const trade = sp.trade ?? ''
  const admin = createAdminClient()

  const [{ data: rawTrades }, { data: rawSeeded }] = await Promise.all([
    admin.from('trade_profiles').select('trade_types, operating_areas'),
    admin.from('seeded_profiles').select('trade_categories, trade_category, operating_areas').eq('status', 'unclaimed'),
  ])

  const claimed = new Map<string, number>()
  const seeded = new Map<string, number>()
  const bump = (m: Map<string, number>, d: string, c: string) => m.set(`${d}|${c}`, (m.get(`${d}|${c}`) ?? 0) + 1)
  const catsOf = (types: string[]) => new Set(types.map(t => parentTrade(t) ?? t))

  for (const t of (rawTrades ?? []) as unknown as { trade_types: string[]; operating_areas: string[] }[]) {
    for (const a of t.operating_areas ?? []) for (const c of Array.from(catsOf(t.trade_types ?? []))) bump(claimed, a, c)
  }
  for (const s of (rawSeeded ?? []) as unknown as { trade_categories: string[] | null; trade_category: string; operating_areas: string[] }[]) {
    const cats = catsOf(s.trade_categories?.length ? s.trade_categories : [s.trade_category])
    for (const a of s.operating_areas ?? []) for (const c of Array.from(cats)) bump(seeded, a, c)
  }

  const keys = new Set([...Array.from(claimed.keys()), ...Array.from(seeded.keys())])
  let rows = Array.from(keys).map(k => {
    const [d, c] = k.split('|')
    return { district: d, category: c, claimed: claimed.get(k) ?? 0, seeded: seeded.get(k) ?? 0 }
  })
  if (district) rows = rows.filter(r => r.district === district)
  if (trade) rows = rows.filter(r => r.category === trade)
  rows.sort((a, b) => a.district.localeCompare(b.district) || b.claimed - a.claimed || a.category.localeCompare(b.category))

  const districtCount = new Set(rows.map(r => r.district)).size

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-navy">Trade coverage</h1>
      <p className="mt-1 text-sm text-gray-600">
        Claimed trades and unclaimed seeded listings by postcode district and trade. A trade counts once in every district they cover.
        Under 3 claimed trades is shown as a gap.
      </p>
      <form className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <input name="district" defaultValue={district} placeholder="District e.g. M20" className="rounded-lg border border-gray-300 px-3 py-1.5" />
        <select name="trade" defaultValue={trade} className="rounded-lg border border-gray-300 px-3 py-1.5">
          <option value="">All trades</option>
          {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="rounded-lg bg-brand-navy px-4 py-1.5 text-xs font-semibold text-white">Filter</button>
      </form>
      <p className="mt-3 text-xs text-gray-500">{rows.length} rows across {districtCount} district{districtCount === 1 ? '' : 's'}</p>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500"><th className="p-3">District</th><th className="p-3">Trade</th><th className="p-3">Claimed trades</th><th className="p-3">Seeded listings</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-gray-500">No trades match.</td></tr>}
            {rows.map(r => (
              <tr key={`${r.district}|${r.category}`} className="border-t border-gray-100">
                <td className="p-3 font-semibold">{r.district}</td><td className="p-3">{r.category}</td>
                <td className="p-3">{r.claimed}</td><td className="p-3">{r.seeded}</td>
                <td className="p-3 text-xs">{r.claimed < 3 && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">Gap</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
