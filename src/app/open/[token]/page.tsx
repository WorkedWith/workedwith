import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAccessLink } from '@/lib/clients/accounts'
import { maskMobile } from '@/lib/phone'
import { otpIsMock } from '@/lib/otp'
import { OpenLink } from './open-link'

export const metadata = { title: 'Open your link | WorkedWith', robots: { index: false } }

const PURPOSE: Record<string, string> = {
  quote: 'your quote',
  job: 'your job',
  variation: 'an extra to approve',
  stage: 'a stage to approve',
  invoice: 'your invoice',
  review: 'your review',
  general: 'your account',
}

/** Every client journey starts here, from a text or email (PRD 18). Designed for a phone first. */
export default async function OpenLinkPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient()
  const link = await resolveAccessLink(admin, params.token)

  if (!link) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold text-brand-navy">This link has expired</h1>
        <p className="mt-2 text-gray-600">Sign in with a text code to see your jobs, or ask the trade to send it again.</p>
        <a href="/sign-in/code" className="mt-6 flex min-h-[52px] items-center justify-center rounded-xl bg-brand-amber text-base font-bold text-brand-navy">Sign in with a text code</a>
      </main>
    )
  }

  // Already signed in as this client: go straight there
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === link.client_user_id) redirect(link.target_path)

  const { data: u } = await admin.from('users').select('full_name, phone').eq('id', link.client_user_id).maybeSingle()
  let from: string | null = null
  if (link.created_by) {
    const { data: tp } = await admin.from('trade_profiles').select('company_name').eq('user_id', link.created_by).maybeSingle()
    from = (tp?.company_name as string | null) ?? null
  }
  const first = ((u?.full_name as string | undefined) ?? '').split(' ')[0]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-brand-navy px-4 py-5">
        <p className="mx-auto max-w-md text-lg font-bold text-white">Worked<span className="text-brand-amber">With</span></p>
      </div>
      <div className="mx-auto max-w-md space-y-5 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{first ? `Hi ${first}` : 'Hello'}</h1>
          <p className="mt-1 text-base text-gray-700">
            {from ? `${from} has sent you ${PURPOSE[link.purpose] ?? 'something'} on WorkedWith.` : `Open ${PURPOSE[link.purpose] ?? 'your account'} on WorkedWith.`}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <OpenLink token={params.token} masked={maskMobile(u?.phone as string | null)} mock={otpIsMock()} />
        </div>
        <p className="text-xs leading-relaxed text-gray-500">
          WorkedWith is free for clients, always. Your account keeps your quotes, approvals and invoices in one place.
          Trades you work with can see your record from WorkedWith jobs. See our <a href="/privacy" className="underline">privacy notice</a>.
        </p>
      </div>
    </main>
  )
}
