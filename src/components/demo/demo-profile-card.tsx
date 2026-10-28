import type { DemoTradeProfile } from '@/lib/demo-data'
import { Avatar } from '@/components/avatar'
import { TradeChip } from '@/components/trade-chip'

type Props = {
  profile: DemoTradeProfile
}

export function DemoProfileCard({ profile }: Props) {
  const hasReviews = profile.total_reviews > 0
  const filled = Math.round(profile.average_rating)

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow relative">
      {/* Example badge */}
      <span className="absolute top-4 right-4 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-400">
        Example profile
      </span>

      {/* Content */}
      <div className="flex-1">
      {/* Top row: name + tier badge */}
      <div className="flex items-start gap-3 pr-24">
        <Avatar name={profile.full_name} sizeClass="h-12 w-12" textClass="text-base" tradeIcon={profile.trade_types[0] ?? null} />
        <div className="min-w-0">
        <h3 className="text-lg font-bold text-brand-navy leading-snug">{profile.full_name}</h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {profile.verification_tier === 'fully_verified' && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              ID verified
            </span>
          )}
          {profile.subscription_tier === 'pro' && (
            <span className="rounded-full bg-brand-amber px-2.5 py-0.5 text-xs font-bold text-brand-navy">
              Pro member
            </span>
          )}
          {profile.subscription_tier === 'standard' && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              Member
            </span>
          )}
        </div>
        </div>
      </div>

      {/* Trade type pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {profile.trade_types.map(t => (
          <TradeChip key={t} trade={t} />
        ))}
      </div>

      {/* Stars + meta */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        {hasReviews ? (
          <>
            <div className="flex gap-0.5 text-base">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>★</span>
              ))}
            </div>
            <span className="text-sm font-semibold text-brand-navy">{profile.average_rating.toFixed(1)}</span>
            <span className="text-sm text-gray-400">({profile.total_reviews} reviews)</span>
          </>
        ) : (
          <span className="text-sm text-gray-400">No reviews yet</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-400">
        <span>📍 {profile.location}</span>
        <span>{profile.years_experience} yrs experience</span>
        <span>{profile.total_jobs} confirmed jobs</span>
      </div>
      {profile.insured_to && <p className="mt-2 text-xs font-medium text-green-700">✓ Insured</p>}
      {profile.hired_again ? (
        <p className="mt-2 text-xs font-medium text-brand-navy">
          Hired again by {profile.hired_again} client{profile.hired_again === 1 ? '' : 's'}
        </p>
      ) : null}
      </div>

      {/* CTA */}
      <div className="mt-auto flex justify-end pt-5">
        <a
          href={`/t/${profile.public_slug}`}
          className="inline-flex min-h-[44px] items-center rounded-xl border-2 border-brand-navy px-5 text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
        >
          View example profile
        </a>
      </div>
    </div>
  )
}
