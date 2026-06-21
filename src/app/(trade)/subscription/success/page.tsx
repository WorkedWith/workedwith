import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/client'

export const metadata = { title: 'Welcome to WorkedWith Pro | WorkedWith' }

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const sessionId = searchParams.session_id
  if (!sessionId) redirect('/subscription')

  const stripe = getStripeClient()

  let tierLabel = 'Pro'

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // Trials use 'no_payment_required'; paid subs use 'paid'. Reject 'unpaid'.
    if (session.payment_status === 'unpaid') redirect('/subscription')

    // Determine tier label from price ID
    const sub = session.subscription
    if (sub && typeof sub !== 'string') {
      const priceId = sub.items?.data[0]?.price.id
      if (priceId === process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID ||
          priceId === process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID) {
        tierLabel = 'Standard'
      }
    }
  } catch {
    redirect('/subscription')
  }

  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-brand-navy">
            Welcome to WorkedWith {tierLabel}
          </h1>

          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            Your subscription is active. You now have access to full client reputation
            profiles, a searchable public profile, and the ability to respond to reviews.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <a
              href="/search"
              className="block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 transition-opacity"
            >
              Look up a client
            </a>
            <a
              href="/dashboard"
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
