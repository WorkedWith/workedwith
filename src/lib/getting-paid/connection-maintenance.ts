import type { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notify'
import { sendEmail } from '@/lib/email/send'
import { bankConnectionLapsed, bankConnectionReconfirm } from '@/lib/email/templates'

type AdminClient = ReturnType<typeof createAdminClient>

const REMIND_DAYS_BEFORE = 7

/**
 * Daily (PRD 9 "staying connected"): prompt the trade to reconfirm in the last 7 days of the 90 day
 * consent, and pause matching once it lapses. Manual marking always keeps working.
 */
export async function runConnectionMaintenance(admin: AdminClient): Promise<{ prompted: number; lapsed: number }> {
  const out = { prompted: 0, lapsed: 0 }
  const now = Date.now()
  const { data } = await admin
    .from('trade_bank_accounts')
    .select('trade_id, consent_expires_at, connection_status, reconfirm_notified_at, lapsed_notified_at')
    .in('connection_status', ['connected', 'needs_reconfirm'])
  for (const row of data ?? []) {
    if (!row.consent_expires_at) continue
    const expires = new Date(row.consent_expires_at).getTime()
    const email = async (content: Parameters<typeof sendEmail>[1]) => {
      const { data: u } = await admin.from('users').select('email').eq('id', row.trade_id).maybeSingle()
      if (u?.email) await sendEmail(u.email as string, content)
    }
    if (expires <= now) {
      await admin.from('trade_bank_accounts').update({ connection_status: 'lapsed', lapsed_notified_at: new Date().toISOString() }).eq('trade_id', row.trade_id)
      await notify(admin, row.trade_id, { type: 'connection', title: 'Your bank connection has lapsed', body: 'Automatic matching is paused. Reconnect in one tap, or mark payments yourself.', link: '/profile/getting-paid' })
      await email(bankConnectionLapsed())
      out.lapsed++
    } else if (expires - now <= REMIND_DAYS_BEFORE * 86_400_000 && !row.reconfirm_notified_at) {
      await admin.from('trade_bank_accounts').update({ connection_status: 'needs_reconfirm', reconfirm_notified_at: new Date().toISOString() }).eq('trade_id', row.trade_id)
      await notify(admin, row.trade_id, { type: 'connection', title: 'Reconfirm your bank connection', body: 'Banks ask you to reconfirm every 90 days. It takes one tap.', link: '/profile/getting-paid' })
      await email(bankConnectionReconfirm())
      out.prompted++
    }
  }
  return out
}
