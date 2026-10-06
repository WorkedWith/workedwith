import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AreasForm } from './areas-form'
import type { DistrictEntry } from '@/actions/resolve-district'

export const metadata: Metadata = { title: 'Operating Areas | WorkedWith' }

export default async function OperatingAreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('trade_profiles')
    .select('operating_areas, boosted_districts, boosted_district_addon_quantity, boosted_districts_updated_at, subscription_period_start_at, subscription_tier, subscription_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding/trade')

  const isPro = (profile.subscription_tier as string) === 'pro'

  // Cooldown: active if boosted_districts_updated_at falls within the current billing period
  const updatedAt = profile.boosted_districts_updated_at as string | null
  const periodStart = profile.subscription_period_start_at as string | null
  const expiresAt = profile.subscription_expires_at as string | null

  const canUpdateBoosts = isPro && (
    updatedAt === null ||
    periodStart === null ||
    new Date(updatedAt) < new Date(periodStart)
  )

  const nextRenewalDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const addonQuantity = (profile.boosted_district_addon_quantity as number) ?? 0
  const maxBoosts = 3 + addonQuantity

  const initialAreas: DistrictEntry[] = ((profile.operating_areas as string[]) ?? []).map(code => ({
    code,
    adminDistrict: null,
  }))

  const initialBoostedDistricts = (profile.boosted_districts as string[]) ?? []

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <a href="/dashboard" className="text-sm text-brand-amber hover:underline">
          ← Dashboard
        </a>
        <h1 className="mt-4 text-2xl font-bold text-brand-navy">Operating Areas</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add the postcode districts where you work — up to 20. Clients searching in these areas
          will find your profile. Type a postcode, district code (e.g. M20), or place name.
        </p>
      </div>

      <div className="space-y-6">
        <AreasForm
          initialAreas={initialAreas}
          isPro={isPro}
          initialBoostedDistricts={initialBoostedDistricts}
          canUpdateBoosts={canUpdateBoosts}
          nextRenewalDate={nextRenewalDate}
          maxBoosts={maxBoosts}
        />
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Operating Area changes take effect immediately. No cooldown applies.
      </p>
    </main>
  )
}
