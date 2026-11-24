import { createAdminClient } from '@/lib/supabase/admin'
import { setDistrictBoostsEnabled } from '@/actions/admin/boost-settings'
import { isOnPaidPlan } from '@/lib/plan'

export const metadata = { title: 'Boosted Districts | Admin' }

export default async function AdminBoostsPage({ searchParams }: { searchParams: { error?: string } }) {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [{ data: settings }, { data: searches }, { data: boosters }, { data: waiting }] = await Promise.all([
    admin.from('boost_district_settings').select('*').order('district'),
    admin.from('search_events').select('district').gte('created_at', since).limit(20000),
    admin.from('trade_profiles').select('boosted_districts, subscription_status, trial_ends_at').eq('subscription_status', 'active'),
    admin.from('boost_waitlist').select('district').is('removed_at', null),
  ])

  const searchCount = new Map<string, number>()
  for (const s of searches ?? []) searchCount.set(s.district as string, (searchCount.get(s.district as string) ?? 0) + 1)
  const boostCount = new Map<string, number>()
  for (const b of boosters ?? []) {
    if (!isOnPaidPlan({ subscription_status: b.subscription_status as string, trial_ends_at: b.trial_ends_at as string | null })) continue
    for (const d of (b.boosted_districts as string[]) ?? []) boostCount.set(d, (boostCount.get(d) ?? 0) + 1)
  }
  const waitCount = new Map<string, number>()
  for (const w of waiting ?? []) waitCount.set(w.district as string, (waitCount.get(w.district as string) ?? 0) + 1)

  const enabled = new Map((settings ?? []).map(s => [s.district as string, Boolean(s.boosts_enabled)]))
  const districts = Array.from(new Set([...Array.from(enabled.keys()), ...Array.from(searchCount.keys())]))
    .sort((a, b) => (searchCount.get(b) ?? 0) - (searchCount.get(a) ?? 0))
    .slice(0, 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Boosted Districts</h1>
        <p className="mt-1 text-sm text-gray-600">
          Switch boosts on once clients are searching in a district (decision 16). £10 a month per district, up to 3
          trades per trade type, paid plan only.
        </p>
        {searchParams.error && <p className="mt-2 text-sm text-red-600">{searchParams.error}</p>}
      </div>

      <form action={setDistrictBoostsEnabled} className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-sm text-gray-700">District
          <input name="district" required placeholder="WA14" className="mt-1 block min-h-[44px] rounded-lg border border-gray-300 px-3 uppercase" />
        </label>
        <input type="hidden" name="enabled" value="true" />
        <button className="min-h-[44px] rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white">Switch boosts on</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">District</th>
              <th className="px-4 py-2">Searches (30 days)</th>
              <th className="px-4 py-2">Boosting</th>
              <th className="px-4 py-2">Waiting</th>
              <th className="px-4 py-2">Boosts</th>
            </tr>
          </thead>
          <tbody>
            {districts.map(d => {
              const on = enabled.get(d) ?? false
              return (
                <tr key={d} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-semibold">{d}</td>
                  <td className="px-4 py-2">{searchCount.get(d) ?? 0}</td>
                  <td className="px-4 py-2">{boostCount.get(d) ?? 0}</td>
                  <td className="px-4 py-2">{waitCount.get(d) ?? 0}</td>
                  <td className="px-4 py-2">
                    <form action={setDistrictBoostsEnabled}>
                      <input type="hidden" name="district" value={d} />
                      <input type="hidden" name="enabled" value={on ? 'false' : 'true'} />
                      <button className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold ${on ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {on ? 'On (switch off)' : 'Off (switch on)'}
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
