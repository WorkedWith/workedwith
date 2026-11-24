import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GALLERY_LIMIT } from '@/lib/gallery-limits'
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

  const admin = createAdminClient()

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!tradeProfile) redirect('/onboarding/trade')

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

  const limit = GALLERY_LIMIT

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

        <GalleryClient
          images={images}
          limit={limit}
          isPro
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
        />
      </div>
    </main>
  )
}
