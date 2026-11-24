import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanState, PLAN_PRICE_TEXT, BOOST_PRICE_TEXT } from '@/lib/plan'
import { AddCardButton, ManageButton } from './subscription-buttons'
import { BackLink } from '@/components/back-link'

export const metadata = { title: 'Your plan | WorkedWith' }

const INCLUDED = [
  'Unlimited quotes, jobs, invoices and chasing',
  'Bank transfer payments that mark themselves paid, with no transaction fees',
  'Accounting sync with Xero, QuickBooks, FreeAgent or Sage',
  'Up to 10 gallery photos and 3 featured jobs',
  'Up to 20 operating districts',
  'Full client records and client lookup',
  'Review responses and profile activity',
]

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('phone_verified, user_type').eq('id', user.id).single()
  if (!userData || !userData.phone_verified) redirect('/verify/phone')
  if (userData.user_type !== 'trade' && userData.user_type !== 'both') redirect('/dashboard')

  const { data: profile } = await admin
    .from('trade_profiles')
    .select('subscription_expires_at, stripe_subscription_id, boosted_districts')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = await getPlanState(user.id, admin)
  const subscribed = plan.status === 'active' && !!profile?.stripe_subscription_id
  const boosts = ((profile?.boosted_districts as string[] | null) ?? []).length

  let headline: string
  let detail: string
  if (subscribed) {
    headline = 'Your plan is active'
    detail = plan.trialDaysLeft && plan.trialDaysLeft > 0
      ? `Your card is saved. The first payment is taken on ${fmtDate(plan.trialEndsAt)}.`
      : `${PLAN_PRICE_TEXT}. ${profile?.subscription_expires_at ? `Renews on ${fmtDate(profile.subscription_expires_at as string)}.` : ''}`
  } else if (plan.grant) {
    headline = `Free until ${fmtDate(plan.grant.ends_at)}`
    detail = plan.grant.reason === 'founding'
      ? 'Founding member offer. Nothing to pay and no card needed.'
      : 'Nothing to pay and no card needed.'
  } else if (plan.status === 'trialing' && plan.hasPlan) {
    headline = `Free trial: ${plan.trialDaysLeft} ${plan.trialDaysLeft === 1 ? 'day' : 'days'} left`
    detail = `Your trial ends on ${fmtDate(plan.trialEndsAt)}. Add a card before then to keep everything running.`
  } else {
    headline = plan.status === 'cancelled' ? 'Your plan has ended' : 'Your free trial has ended'
    detail = 'You can’t send new quotes, your listing is hidden and chasing has stopped. Clients can still pay invoices you have already sent.'
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <BackLink href="/profile" label="Back to profile" />

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your plan</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-navy">{headline}</h1>
          <p className="mt-2 text-sm text-gray-600">{detail}</p>
          <div className="mt-5">
            {subscribed ? <ManageButton /> : <AddCardButton label={plan.hasPlan ? 'Add a card' : 'Restart my plan'} />}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-brand-navy">One plan, {PLAN_PRICE_TEXT}</h2>
          <p className="mt-1 text-sm text-gray-600">Every trade gets the same features. No transaction fees, ever.</p>
          <ul className="mt-4 space-y-2">
            {INCLUDED.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 font-bold text-brand-amber" aria-hidden="true">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-brand-amber/40 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-brand-navy">Boosted Districts</h2>
          <p className="mt-1 text-sm text-gray-600">
            Optional. {BOOST_PRICE_TEXT} per district, once you are on the paid plan. Boosted trades show at the top
            of Find for that district, always labelled Boosted. Reviews and scores are never affected.
          </p>
          <p className="mt-3 text-sm font-medium text-brand-navy">
            {plan.onPaidPlan ? `You boost ${boosts} ${boosts === 1 ? 'district' : 'districts'}.` : 'Available once your trial has ended and your plan is active.'}
          </p>
          <a href="/profile/areas" className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-navy underline">
            Manage districts
          </a>
        </section>
      </div>
    </main>
  )
}
