import type { createAdminClient } from '@/lib/supabase/admin'
import { formatPence } from '@/lib/money'
import { CardPay } from './card-pay'

type AdminClient = ReturnType<typeof createAdminClient>

/** Pay by card, when the trade accepts cards and the amount is within their card limit (PRD 9). */
export async function ClientPayExtras({ admin, stageId, tradeUserId, balancePence }: { admin: AdminClient; stageId: string; tradeUserId: string; balancePence: number }) {
  const { data: acc } = await admin.from('trade_card_accounts').select('cards_enabled, charges_enabled, card_limit_pence').eq('trade_id', tradeUserId).maybeSingle()
  if (!acc?.cards_enabled || !acc.charges_enabled) return null
  const { data: tp } = await admin.from('trade_profiles').select('part_payments_enabled').eq('user_id', tradeUserId).maybeSingle()
  const limit = acc.card_limit_pence as number
  const allowPart = !!tp?.part_payments_enabled
  if (balancePence > limit && !allowPart) return <p className="mt-2 text-xs text-gray-500">Card payments are limited to {formatPence(limit)}, so please pay this by bank transfer.</p>
  const start = Math.min(balancePence, limit)
  return <CardPay stageId={stageId} balance={(start / 100).toFixed(2)} allowPart={allowPart} limitText={balancePence > limit ? `Cards are limited to ${formatPence(limit)} a payment. Pay the rest by bank transfer.` : null} />
}
