import { NextResponse } from 'next/server'
import { refreshCardAccount } from '@/actions/cards'
import { APP_URL } from '@/lib/app-url'

export const dynamic = 'force-dynamic'

/** Back from Stripe onboarding (or the mock). */
export async function GET(): Promise<NextResponse> {
  await refreshCardAccount()
  return NextResponse.redirect(`${APP_URL}/profile/getting-paid?cards=ready`)
}
