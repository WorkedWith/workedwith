import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe/client'
import type { SubscriptionTier } from '@/types/database'
import { UpgradeButton, ManageButton } from './subscription-buttons'

export const metadata = { title: 'Subscription | WorkedWith' }

// ── Feature table ─────────────────────────────────────────────

const FEATURES: { label: string; free: boolean; pro: boolean; team: boolean }[] = [
  { label: 'Unlimited jobs and reviews',       free: true,  pro: true,  team: true  },
  { label: 'Verified review history',          free: true,  pro: true,  team: true  },
  { label: 'Public profile page',              free: true,  pro: true,  team: true  },
  { label: 'Searchable profile',               free: false, pro: true,  team: true  },
  { label: 'Full client reputation lookup',    free: false, pro: true,  team: true  },
  { label: 'Respond to reviews',               free: false, pro: true,  team: true  },
  { label: 'Priority search placement',        free: false, pro: false, team: true  },
  { label: 'Team member seats',                free: false, pro: false, team: true  },
  { label: 'API access',                       free: false, pro: false, team: true  },
]

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function tierLabel(tier: SubscriptionTier): string {
  if (tier === 'pro')  return 'Pro'
  if (tier === 'team') return 'Team'
  return 'Free'
}

// ── Page ──────────────────────────────────────────────────────

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || !userData.phone_verified) redirect('/verify/phone')
  if (userData.user_type !== 'trade' && userData.user_type !== 'both') redirect('/dashboard')

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentTier = (tradeProfile?.subscription_tier as SubscriptionTier | null | undefined) ?? 'free'
  const subscriptionId = tradeProfile?.stripe_subscription_id as string | null | undefined
  const isPaid = currentTier === 'pro' || currentTier === 'team'

  // Fetch next billing date via upcoming invoice preview
  let nextBillingDate: string | null = null
  if (subscriptionId) {
    try {
      const stripe = getStripeClient()
      const preview = await stripe.invoices.createPreview({ subscription: subscriptionId })
      const ts = preview.next_payment_attempt ?? preview.period_end
      if (ts) nextBillingDate = fmtDate(ts)
    } catch {
      // Non-fatal — billing date is informational only
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <a href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-10">

        {/* Current plan banner */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current plan</p>
              <p className="mt-1 text-2xl font-bold text-brand-navy">{tierLabel(currentTier)}</p>
              {isPaid && nextBillingDate && (
                <p className="mt-1 text-sm text-gray-500">Next billing date: {nextBillingDate}</p>
              )}
              {!isPaid && (
                <p className="mt-1 text-sm text-gray-500">Free forever &mdash; upgrade any time.</p>
              )}
            </div>
            {isPaid && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                Active
              </span>
            )}
          </div>
          {isPaid && (
            <div className="mt-4">
              <ManageButton currentTier={currentTier} />
            </div>
          )}
        </div>

        {/* Tier cards */}
        <div>
          <h2 className="mb-5 text-xl font-bold text-brand-navy">Plans</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <TierCard
              name="Free"
              price="£0"
              period="forever"
              description="Everything you need to build a verified reputation."
              highlight={currentTier === 'free'}
              isCurrent={currentTier === 'free'}
              cta={null}
            />
            <TierCard
              name="Pro"
              price="£19"
              period="per month"
              description="Full client lookup, searchable profile, and review responses."
              highlight={currentTier === 'pro'}
              isCurrent={currentTier === 'pro'}
              cta={
                currentTier === 'free' ? (
                  <UpgradeButton
                    tier="pro"
                    label="Start 14-day free trial"
                    className="w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy transition-opacity hover:opacity-90"
                  />
                ) : currentTier === 'team' ? null : null
              }
            />
            <TierCard
              name="Team"
              price="£59"
              period="per month"
              description="Priority placement, team seats, and API access."
              highlight={currentTier === 'team'}
              isCurrent={currentTier === 'team'}
              cta={
                (currentTier === 'free' || currentTier === 'pro') ? (
                  <UpgradeButton
                    tier="team"
                    label="Start 14-day free trial"
                    className="w-full rounded-lg bg-brand-navy px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
                  />
                ) : null
              }
            />
          </div>
        </div>

        {/* Feature comparison table */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-brand-navy">What&apos;s included</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Header row */}
            <div className="grid grid-cols-4 border-b border-gray-100 bg-gray-50">
              <div className="px-5 py-3 text-sm font-medium text-gray-500">Feature</div>
              {(['Free', 'Pro', 'Team'] as const).map(t => (
                <div key={t} className="px-3 py-3 text-center text-sm font-semibold text-brand-navy">
                  {t}
                </div>
              ))}
            </div>

            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className={`grid grid-cols-4 ${i < FEATURES.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="px-5 py-3 text-sm text-gray-700">{f.label}</div>
                <FeatureCell included={f.free} />
                <FeatureCell included={f.pro} />
                <FeatureCell included={f.team} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400 text-center">
            Jobs and reviews are never capped — WorkedWith is a trust layer, not a paywall.
          </p>
        </div>

      </div>
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────

function TierCard({
  name,
  price,
  period,
  description,
  highlight,
  isCurrent,
  cta,
}: {
  name: string
  price: string
  period: string
  description: string
  highlight: boolean
  isCurrent: boolean
  cta: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border-2 p-5 flex flex-col gap-4 ${
      highlight ? 'border-brand-amber bg-amber-50' : 'border-gray-200 bg-white'
    }`}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-bold text-brand-navy">{name}</p>
          {isCurrent && (
            <span className="inline-flex items-center rounded-full bg-brand-navy px-2 py-0.5 text-xs font-semibold text-white">
              Current
            </span>
          )}
        </div>
        <p className="mt-1">
          <span className="text-2xl font-bold text-brand-navy">{price}</span>
          <span className="text-sm text-gray-500"> {period}</span>
        </p>
        <p className="mt-2 text-sm text-gray-600 leading-snug">{description}</p>
      </div>
      {cta && <div className="mt-auto">{cta}</div>}
    </div>
  )
}

function FeatureCell({ included }: { included: boolean }) {
  return (
    <div className="flex items-center justify-center px-3 py-3">
      {included ? (
        <span className="text-green-600 font-bold text-base" aria-label="Included">✓</span>
      ) : (
        <span className="text-gray-300 text-base" aria-label="Not included">—</span>
      )}
    </div>
  )
}
