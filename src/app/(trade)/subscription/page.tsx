import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe/client'
import type { BillingPeriod, SubscriptionTier } from '@/types/database'
import { ManageButton } from './subscription-buttons'
import { SubscriptionTierCards } from './subscription-tier-cards'
import { BoostedAddonManager } from './boosted-addon-manager'

export const metadata = { title: 'Subscription | WorkedWith' }

// ── Feature table ─────────────────────────────────────────────

const FEATURES: { label: string; free: boolean; standard: boolean; pro: boolean }[] = [
  { label: 'Unlimited jobs and reviews',          free: true,  standard: true,  pro: true  },
  { label: 'Verified review history',             free: true,  standard: true,  pro: true  },
  { label: 'Public profile page',                 free: true,  standard: true,  pro: true  },
  { label: 'Respond to reviews',                  free: true,  standard: true,  pro: true  },
  { label: 'Basic client lookup',                 free: true,  standard: true,  pro: true  },
  { label: 'Full client reputation lookup',       free: false, standard: true,  pro: true  },
  { label: 'Verified badge on profile',           free: false, standard: true,  pro: true  },
  { label: 'Featured job images',                 free: false, standard: true,  pro: true  },
  { label: 'Boosted Districts — 3 included, additional districts £10/month each', free: false, standard: false, pro: true },
  { label: 'Pro badge on profile and in search',  free: false, standard: false, pro: true  },
  { label: 'Extended featured job images',        free: false, standard: false, pro: true  },
  { label: 'Profile analytics',                   free: false, standard: false, pro: true  },
  { label: 'Priority dispute resolution',         free: false, standard: false, pro: true  },
]

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function tierLabel(tier: SubscriptionTier): string {
  if (tier === 'pro')      return 'Pro'
  if (tier === 'standard') return 'Standard'
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
  const currentBillingPeriod = (tradeProfile?.billing_period as BillingPeriod | null | undefined) ?? 'monthly'
  const subscriptionId = tradeProfile?.stripe_subscription_id as string | null | undefined
  const isPaid = currentTier === 'standard' || currentTier === 'pro'
  const isPro = currentTier === 'pro'

  // ── Boosted add-on props (Pro only) ───────────────────────────
  const addonQty = (tradeProfile?.boosted_district_addon_quantity as number | null | undefined) ?? 0
  const activeBoostedCount = ((tradeProfile?.boosted_districts as string[] | null | undefined) ?? []).length

  // Compute cooldown for decrease — mirrors update-boosted-addon-quantity action logic
  let canDecrease = true
  let cooldownMessage: string | null = null

  if (isPro) {
    const updatedAt = tradeProfile?.boosted_districts_updated_at as string | null | undefined
    if (updatedAt) {
      const updatedDate = new Date(updatedAt)
      const isAnnual = currentBillingPeriod === 'annual'
      if (isAnnual) {
        const availableAt = new Date(updatedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        if (new Date() < availableAt) {
          canDecrease = false
          cooldownMessage = `Available from ${availableAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (30-day cooldown).`
        }
      } else {
        const periodStart = tradeProfile?.subscription_period_start_at as string | null | undefined
        if (periodStart && updatedDate >= new Date(periodStart)) {
          canDecrease = false
          const expiresAt = tradeProfile?.subscription_expires_at as string | null | undefined
          const renewalFmt = expiresAt
            ? new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'your next renewal'
          cooldownMessage = `Available from ${renewalFmt} (one change per billing cycle).`
        }
      }
    }
  }

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
              {isPaid && (
                <p className="mt-0.5 text-sm text-gray-500">
                  {currentBillingPeriod === 'annual' ? 'Annual billing' : 'Monthly billing'}
                  {nextBillingDate && ` · Next renewal ${nextBillingDate}`}
                </p>
              )}
              {!isPaid && (
                <p className="mt-1 text-sm text-gray-500">Free forever — upgrade any time.</p>
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

        {/* Boosted District add-on management (Pro only) */}
        {isPro && subscriptionId && (
          <BoostedAddonManager
            currentAddonQty={addonQty}
            activeBoostedCount={activeBoostedCount}
            canDecrease={canDecrease}
            cooldownMessage={cooldownMessage}
          />
        )}

        {/* Tier cards with period toggle */}
        <SubscriptionTierCards
          currentTier={currentTier}
          currentBillingPeriod={currentBillingPeriod}
        />

        {/* Feature comparison table */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-brand-navy">What&apos;s included</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-4 border-b border-gray-100 bg-gray-50">
              <div className="px-5 py-3 text-sm font-medium text-gray-500">Feature</div>
              {(['Free', 'Standard', 'Pro'] as const).map(t => (
                <div key={t} className="px-3 py-3 text-center text-sm font-semibold text-brand-navy">{t}</div>
              ))}
            </div>
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className={`grid grid-cols-4 ${i < FEATURES.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="px-5 py-3 text-sm text-gray-700">{f.label}</div>
                <FeatureCell included={f.free} />
                <FeatureCell included={f.standard} />
                <FeatureCell included={f.pro} />
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

function FeatureCell({ included }: { included: boolean }) {
  return (
    <div className="flex items-center justify-center px-3 py-3">
      {included
        ? <span className="text-green-600 font-bold text-base" aria-label="Included">✓</span>
        : <span className="text-gray-300 text-base" aria-label="Not included">—</span>
      }
    </div>
  )
}
