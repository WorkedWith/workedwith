import { ADDON_PRICE_TEXT, INCLUDED_BOOSTS } from '@/lib/boost-types'

type Props = {
  boostedCount: number
  billedSlots: number
  paidSlots: number
  renewsOn: string | null
}

export function BoostSummaryCard({ boostedCount, billedSlots, paidSlots, renewsOn }: Props) {
  const usedPaid = Math.max(0, boostedCount - INCLUDED_BOOSTS)
  const unusedPaid = Math.max(0, paidSlots - usedPaid)
  const renewal = renewsOn
    ? new Date(renewsOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'your next renewal'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-brand-navy">Boosted Districts</h2>
      <p className="mt-2 text-sm text-gray-700">
        {boostedCount} in use: {Math.min(boostedCount, INCLUDED_BOOSTS)} included
        {usedPaid > 0 ? `, ${usedPaid} paid at ${ADDON_PRICE_TEXT} each` : ''}.
      </p>
      {billedSlots > 0 && (
        <p className="mt-1 text-sm text-gray-500">
          Your next invoice includes {billedSlots} extra {billedSlots === 1 ? 'district' : 'districts'} ({ADDON_PRICE_TEXT} each).
        </p>
      )}
      {unusedPaid > 0 && (
        <p className="mt-1 text-sm text-amber-700">
          {unusedPaid} paid {unusedPaid === 1 ? 'slot is' : 'slots are'} not in use and will stop on {renewal}.
        </p>
      )}
      <a href="/profile/areas" className="mt-4 inline-block text-sm font-semibold text-brand-navy underline">
        Manage boosted districts
      </a>
    </div>
  )
}
