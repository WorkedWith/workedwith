import Link from 'next/link'
import { galleryLimit } from '@/lib/gallery-limits'

type Props = { tier: string | null; galleryCount: number }

/** Only the tradesperson sees this, on their own profile. It never shows publicly. */
export function OwnerPhotosPanel({ tier, galleryCount }: Props) {
  const paid = tier === 'standard' || tier === 'pro'
  const limit = galleryLimit(tier)

  return (
    <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Only you can see this</p>
      <h2 className="mt-1 text-base font-semibold text-brand-navy">Photos of your work</h2>
      {paid ? (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {galleryCount} of {limit} photos added. Clients see your approved photos on your public profile.
            {tier === 'pro' && ' As a Pro member you can also add photos to each confirmed job.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/profile/gallery" className="inline-flex h-11 items-center rounded-lg bg-brand-amber px-5 text-sm font-bold text-brand-navy hover:bg-amber-400">
              {galleryCount === 0 ? 'Add photos' : 'Manage photos'}
            </Link>
            {tier === 'pro' && (
              <Link href="/profile/featured-jobs" className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-5 text-sm font-semibold text-brand-navy hover:bg-gray-50">
                Photos on confirmed jobs
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-5 gap-2" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xl text-gray-300">+</div>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Show clients your work. Standard adds up to 5 photos to your profile, Pro up to 10 plus photos on each confirmed job.
          </p>
          <Link href="/subscription" className="mt-3 inline-flex h-11 items-center rounded-lg bg-brand-amber px-5 text-sm font-bold text-brand-navy hover:bg-amber-400">
            Upgrade to add photos
          </Link>
        </>
      )}
    </section>
  )
}
