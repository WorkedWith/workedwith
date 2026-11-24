import type { createAdminClient } from '@/lib/supabase/admin'
import { openBanking } from '@/lib/open-banking'
import { decryptSecret, encryptSecret } from '@/lib/crypto/secret-box'
import { hasActivePlan } from '@/lib/plan'
import { processIncomingPayment } from './matching'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Read incoming payments for every connected trade and match them. Runs daily from the shared cron and can
 * also be triggered by provider notifications. Paused for trades whose trial or plan has ended (PRD 3).
 */
export async function runBankSync(admin: AdminClient): Promise<{ trades: number; payments: number; errors: number }> {
  const out = { trades: 0, payments: 0, errors: 0 }
  const provider = openBanking()
  const { data: rows } = await admin
    .from('trade_bank_accounts')
    .select('trade_id, provider, provider_connection_id, last_synced_at, connected_at')
    .in('connection_status', ['connected', 'needs_reconfirm'])
    .eq('provider', provider.id)
  for (const r of rows ?? []) {
    if (!r.provider_connection_id) continue
    if (!(await hasActivePlan(r.trade_id, admin))) continue
    const since = new Date(r.last_synced_at ?? r.connected_at ?? Date.now() - 7 * 86_400_000)
    try {
      const res = await provider.listIncomingPayments({ connectionSecret: decryptSecret(r.provider_connection_id), since: new Date(since.getTime() - 86_400_000) })
      for (const p of res.payments) {
        await processIncomingPayment(admin, r.trade_id, p)
        out.payments++
      }
      await admin.from('trade_bank_accounts').update({
        last_synced_at: new Date().toISOString(),
        ...(res.connectionSecret ? { provider_connection_id: encryptSecret(res.connectionSecret) } : {}),
      }).eq('trade_id', r.trade_id)
      const now = new Date()
      const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
      const { data: usage } = await admin.from('open_banking_usage').select('id, data_refreshes').eq('trade_id', r.trade_id).eq('month', month).maybeSingle()
      if (usage) await admin.from('open_banking_usage').update({ data_refreshes: usage.data_refreshes + 1, connection_active: true }).eq('id', usage.id)
      else await admin.from('open_banking_usage').insert({ trade_id: r.trade_id, month, connection_active: true, data_refreshes: 1 })
      out.trades++
    } catch (err) {
      console.error('Bank sync failed for a trade:', err)
      out.errors++
    }
  }
  return out
}
