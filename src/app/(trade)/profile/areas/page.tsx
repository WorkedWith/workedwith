import { getPlanState } from '@/lib/plan'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AreasForm } from './areas-form'
import type { DistrictEntry } from '@/actions/resolve-district'
import type { BoostSummary } from '@/lib/boost-types'
import { BackLink } from '@/components/back-link'

export const metadata: Metadata = { title: 'Operating Areas | WorkedWith' }

export default async function OperatingAreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('trade_profiles')
    .select('operating_areas, boosted_districts, boosted_district_addon_quantity, boosted_district_addon_paid_quantity, subscription_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding/trade')

  // Boosts are for the paid plan only, never during the trial (decision 17)
  const canBoost = (await getPlanState(user.id, admin)).onPaidPlan
  const { data: enabledRows } = await admin.from('boost_district_settings').select('district').eq('boosts_enabled', true)
  const enabledDistricts = (enabledRows ?? []).map(r => r.district as string)

  const billed = (profile.boosted_district_addon_quantity as number | null) ?? 0
  const paid = Math.max((profile.boosted_district_addon_paid_quantity as number | null) ?? 0, billed)

  const initialBoost: BoostSummary = {
    boosted: (profile.boosted_districts as string[] | null) ?? [],
    billedSlots: billed,
    paidSlots: paid,
    renewsOn: (profile.subscription_expires_at as string | null) ?? null,
  }


  const initialAreas: DistrictEntry[] = ((profile.operating_areas as string[]) ?? []).map(code => ({
    code,
    adminDistrict: null,
  }))

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <BackLink href="/profile" label="Back to profile" />
        <h1 className="mt-1 text-2xl font-bold text-brand-navy">Operating Areas</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add the postcode districts where you work, up to 20. Clients searching in these areas
          will find your profile. Type a postcode, district code (e.g. M20), or place name.
        </p>
      </div>

      <div className="space-y-6">
        <AreasForm
          initialAreas={initialAreas}
          canBoost={canBoost}
          initialBoost={initialBoost}
          enabledDistricts={enabledDistricts}
        />
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Changes to your operating areas and boosts take effect immediately.
      </p>
    </main>
  )
}
