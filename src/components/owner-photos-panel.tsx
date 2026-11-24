import Link from 'next/link'
import { GALLERY_LIMIT, FEATURED_JOBS_LIMIT } from '@/lib/gallery-limits'

type Props = { galleryCount: number }

/** Only the tradesperson sees this, on their own profile. It never shows publicly. */
export function OwnerPhotosPanel({ galleryCount }: Props) {
  return (
    <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Only you can see this</p>
      <h2 className="mt-1 text-base font-semibold text-brand-navy">Photos of your work</h2>
      <p className="mt-1 text-sm text-gray-600">
        {galleryCount} of {GALLERY_LIMIT} gallery photos added. You can also feature up to {FEATURED_JOBS_LIMIT} paid
        WorkedWith jobs with 5 photos each.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/profile/gallery" className="inline-flex h-11 items-center rounded-lg bg-brand-amber px-5 text-sm font-bold text-brand-navy hover:bg-amber-400">
          {galleryCount === 0 ? 'Add photos' : 'Manage photos'}
        </Link>
        <Link href="/profile/featured-jobs" className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-5 text-sm font-semibold text-brand-navy hover:bg-gray-50">
          Featured jobs
        </Link>
      </div>
    </section>
  )
}
