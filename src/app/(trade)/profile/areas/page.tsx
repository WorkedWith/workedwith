import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AreasForm } from './areas-form'
import type { DistrictEntry } from '@/actions/resolve-district'
import type { BoostSummary } from '@/lib/boost-types'

export const metadata: Metadata = { title: 'Operating Areas | WorkedWith' }

export default async function OperatingAreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('trade_profiles')
    .select('operating_areas, boosted_districts, boosted_district_addon_quantity, boosted_district_addon_paid_quantity, subscription_tier, subscription_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding/trade')

  const isPro = (profile.subscription_tier as string) === 'pro'

  const billed = (profile.boosted_district_addon_quantity as number | null) ?? 0
  const paid = Math.max((profile.boosted_district_addon_paid_quantity as number | null) ?? 0, billed)

  const initialBoost: BoostSummary = {
    boosted: (profile.boosted_districts as string[] | null) ?? [],
    billedSlots: billed,
    paidSlots: paid,
    renewsOn: (profile.subscription_expires_at as string | null) ?? null,
  }

  // Annual billing is deferred (PRD v3.5), so the monthly add-on price is the only one in use
  const extraDistrictsAvailable = !!process.env.STRIPE_PRO_ADDON_PRICE_ID
  const unavailableNote = extraDistrictsAvailable ? null : 'Extra boosted districts are not available right now.'

  const initialAreas: DistrictEntry[] = ((profile.operating_areas as string[]) ?? []).map(code => ({
    code,
    adminDistrict: null,
  }))

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <a href="/dashboard" className="text-sm text-brand-amber hover:underline">
          ← Dashboard
        </a>
        <h1 className="mt-4 text-2xl font-bold text-brand-navy">Operating Areas</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add the postcode districts where you work, up to 20. Clients searching in these areas
          will find your profile. Type a postcode, district code (e.g. M20), or place name.
        </p>
      </div>

      <div className="space-y-6">
        <AreasForm
          initialAreas={initialAreas}
          isPro={isPro}
          initialBoost={initialBoost}
          extraDistrictsAvailable={extraDistrictsAvailable}
          unavailableNote={unavailableNote}
        />
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Changes to your operating areas and boosts take effect immediately.
      </p>
    </main>
  )
}
