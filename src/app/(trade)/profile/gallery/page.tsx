import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTier, isStandardOrAbove } from '@/lib/stripe/get-tier'
import { galleryLimit } from '@/lib/gallery-limits'
import { BackLink } from '@/components/back-link'
import { GalleryClient } from './gallery-client'
import type { ModerationStatus } from '@/types/database'

export const metadata = { title: 'Photos of your work | WorkedWith' }

export type GalleryImageOwner = {
  id: string
  storage_path: string
  caption: string | null
  moderation_status: ModerationStatus
}

export default async function GalleryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const tier = await getUserTier(user.id)
  const admin = createAdminClient()

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!tradeProfile) redirect('/onboarding/trade')

  const paid = isStandardOrAbove(tier)

  const { data: rows } = await admin
    .from('profile_gallery_images')
    .select('id, storage_path, caption, moderation_status')
    .eq('trade_profile_id', tradeProfile.id as string)
    .order('display_order', { ascending: true })

  const images: GalleryImageOwner[] = (rows ?? []).map(r => ({
    id: r.id as string,
    storage_path: r.storage_path as string,
    caption: r.caption as string | null,
    moderation_status: r.moderation_status as ModerationStatus,
  }))

  const limit = galleryLimit(tier)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <BackLink href="/profile" label="Back to profile" />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-navy">Photos of your work</h1>
          <p className="mt-1 text-sm text-gray-500">
            Show clients what you can do. Photos appear on your public profile.
          </p>
        </div>

        {!paid ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-2xl text-gray-300"
                  aria-hidden
                >
                  +
                </div>
              ))}
            </div>
            <h2 className="text-base font-semibold text-brand-navy">Photos are part of Standard and Pro</h2>
            <p className="mt-1 text-sm text-gray-600">
              Standard adds up to 5 photos to your profile. Pro adds up to 10, plus photos on each confirmed job.
              {images.length > 0 && ' Your earlier photos are kept and will show again if you upgrade.'}
            </p>
            <Link
              href="/subscription"
              className="mt-4 inline-flex h-11 items-center rounded-lg bg-brand-amber px-5 text-sm font-bold text-brand-navy hover:bg-amber-400"
            >
              Upgrade to add photos
            </Link>
          </div>
        ) : (
          <GalleryClient
            images={images}
            limit={limit}
            isPro={tier === 'pro'}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
          />
        )}
      </div>
    </main>
  )
}
