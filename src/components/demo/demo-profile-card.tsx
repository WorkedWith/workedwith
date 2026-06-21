import type { DemoTradeProfile } from '@/lib/demo-data'

type Props = {
  profile: DemoTradeProfile
}

export function DemoProfileCard({ profile }: Props) {
  const hasReviews = profile.total_reviews > 0
  const filled = Math.round(profile.average_rating)

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow relative">
      {/* Example badge */}
      <span className="absolute top-4 right-4 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-400">
        Example profile
      </span>

      {/* Top row: name + tier badge */}
      <div className="pr-24">
        <h3 className="text-lg font-bold text-brand-navy leading-snug">{profile.full_name}</h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {profile.verification_tier === 'fully_verified' && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              ID Verified
            </span>
          )}
          {profile.subscription_tier === 'pro' && (
            <span className="rounded-full bg-brand-amber px-2.5 py-0.5 text-xs font-bold text-brand-navy">
              Pro
            </span>
          )}
          {profile.subscription_tier === 'standard' && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Trade type pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {profile.trade_types.map(t => (
          <span key={t} className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {t}
          </span>
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

      {/* CTA */}
      <div className="mt-5 flex justify-end">
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
