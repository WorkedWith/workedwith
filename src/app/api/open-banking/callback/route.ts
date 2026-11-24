import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { openBanking } from '@/lib/open-banking'
import { encryptSecret } from '@/lib/crypto/secret-box'
import { APP_URL } from '@/lib/app-url'

export const dynamic = 'force-dynamic'

const BACK = `${APP_URL}/profile/getting-paid`

/** Return from the bank after the trade approves read only access. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const err = req.nextUrl.searchParams.get('error')
  if (err || !code || !state) return NextResponse.redirect(`${BACK}?bank=cancelled`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/sign-in`)

  const admin = createAdminClient()
  const { data: st } = await admin.from('open_banking_connect_states').select('*').eq('state', state).maybeSingle()
  const fresh = st && !st.used_at && Date.now() - new Date(st.created_at).getTime() < 30 * 60_000
  if (!st || !fresh || st.trade_id !== user.id) return NextResponse.redirect(`${BACK}?bank=expired`)
  await admin.from('open_banking_connect_states').update({ used_at: new Date().toISOString() }).eq('state', state)

  const provider = openBanking()
  try {
    const result = await provider.completeConnection({ code, redirectUri: `${APP_URL}/api/open-banking/callback` })

    // The connected account should be the one clients pay into
    const { data: bank } = await admin.from('trade_bank_accounts').select('sort_code, account_number_last4').eq('trade_id', user.id).maybeSingle()
    const known = result.accounts.filter(a => a.sortCode && a.accountNumberLast4)
    if (bank && known.length > 0 && !known.some(a => a.sortCode === bank.sort_code && a.accountNumberLast4 === bank.account_number_last4)) {
      await provider.revoke({ connectionSecret: result.connectionSecret }).catch(() => undefined)
      return NextResponse.redirect(`${BACK}?bank=wrong_account`)
    }

    const now = new Date()
    await admin
      .from('trade_bank_accounts')
      .update({
        provider: provider.id,
        provider_connection_id: encryptSecret(result.connectionSecret),
        provider_bank_name: result.bankName,
        connected_at: now.toISOString(),
        consent_expires_at: result.consentExpiresAt.toISOString(),
        connection_status: 'connected',
        reconfirm_notified_at: null,
        lapsed_notified_at: null,
        updated_at: now.toISOString(),
      })
      .eq('trade_id', user.id)

    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
    await admin.from('open_banking_usage').upsert({ trade_id: user.id, month, connection_active: true }, { onConflict: 'trade_id,month' })

    return NextResponse.redirect(`${BACK}?bank=connected`)
  } catch (e) {
    console.error('Open banking callback failed:', e)
    return NextResponse.redirect(`${BACK}?bank=failed`)
  }
}
