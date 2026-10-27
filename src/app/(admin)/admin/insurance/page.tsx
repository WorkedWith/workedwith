import { createAdminClient } from '@/lib/supabase/admin'
import { coverLabel, longDate } from '@/lib/insurance'
import type { TradeInsurance } from '@/types/database'
import { InsuranceDecision } from './insurance-decision'

export const metadata = { title: 'Insurance — WorkedWith Admin' }

export default async function InsuranceQueuePage() {
  const admin = createAdminClient()
  const { data } = await admin.from('trade_insurance').select('*').eq('status', 'pending').order('created_at', { ascending: true })
  const rows = (data ?? []) as unknown as TradeInsurance[]

  const tradeIds = rows.map(r => r.trade_id)
  const { data: tps } = tradeIds.length ? await admin.from('trade_profiles').select('id, user_id, company_name, trade_types').in('id', tradeIds) : { data: [] }
  const profiles = (tps ?? []) as unknown as { id: string; user_id: string; company_name: string | null; trade_types: string[] }[]
  const { data: us } = profiles.length ? await admin.from('users').select('id, full_name, email').in('id', profiles.map(p => p.user_id)) : { data: [] }
  const users = (us ?? []) as unknown as { id: string; full_name: string; email: string | null }[]

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Insurance</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Check the business name matches the profile, it is public liability cover, and the dates are current. {rows.length} waiting.
      </p>
      {rows.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Nothing waiting.</p>}
      <div className="space-y-4">
        {rows.map(r => {
          const tp = profiles.find(p => p.id === r.trade_id)
          const u = users.find(x => x.id === tp?.user_id)
          return (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">{u?.full_name ?? 'Unknown'}{tp?.company_name ? ` · ${tp.company_name}` : ''}</p>
              <p className="text-xs text-gray-500">{u?.email} · {(tp?.trade_types ?? []).join(', ')}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-gray-400">Insurer</dt><dd className="text-gray-800">{r.insurer}</dd></div>
                <div><dt className="text-gray-400">Cover</dt><dd className="text-gray-800">{coverLabel(Number(r.cover_amount_gbp))}</dd></div>
                <div><dt className="text-gray-400">Runs out</dt><dd className="text-gray-800">{longDate(r.expires_on)}</dd></div>
                <div><dt className="text-gray-400">Uploaded</dt><dd className="text-gray-800">{new Date(r.created_at).toLocaleDateString('en-GB')}</dd></div>
              </dl>
              <InsuranceDecision id={r.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
