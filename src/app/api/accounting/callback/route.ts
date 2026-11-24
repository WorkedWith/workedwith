import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accountingProvider } from '@/lib/accounting'
import { encryptSecret } from '@/lib/crypto/secret-box'
import { APP_URL } from '@/lib/app-url'
import type { AccountingPlatform } from '@/types/v42'

export const dynamic = 'force-dynamic'
const BACK = `${APP_URL}/profile/getting-paid`

/** Return from the accounting software after the trade approves. Then they confirm accounts and VAT. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  if (!code || !state) return NextResponse.redirect(`${BACK}?accounting=cancelled`)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/sign-in`)
  const admin = createAdminClient()
  const { data: st } = await admin.from('accounting_connect_states').select('*').eq('state', state).maybeSingle()
  if (!st || st.used_at || st.trade_id !== user.id || Date.now() - new Date(st.created_at).getTime() > 30 * 60_000) return NextResponse.redirect(`${BACK}?accounting=expired`)
  await admin.from('accounting_connect_states').update({ used_at: new Date().toISOString() }).eq('state', state)
  const platform = st.platform as AccountingPlatform
  try {
    const r = await accountingProvider(platform).completeConnection({ code, redirectUri: `${APP_URL}/api/accounting/callback`, realmId: req.nextUrl.searchParams.get('realmId') })
    await admin.from('accounting_connections').upsert({
      trade_id: user.id, platform, external_org_id: r.orgId, external_org_name: r.orgName,
      tokens_encrypted: encryptSecret(JSON.stringify(r.tokens)), token_expires_at: r.tokens.expiresAt, status: 'setup',
      setup_options: { sales: r.salesAccounts, bank: r.bankAccounts, defaultSales: r.defaultSales, defaultBank: r.defaultBank },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'trade_id' })
    return NextResponse.redirect(`${APP_URL}/profile/getting-paid/accounting-setup`)
  } catch (e) {
    console.error('Accounting callback failed:', e)
    return NextResponse.redirect(`${BACK}?accounting=failed`)
  }
}
