import { createAdminClient } from '@/lib/supabase/admin'
import { PhotoButtons } from './photo-buttons'

const BUCKET = 'featured-job-images'

/** Gallery photos waiting for a manual check, and photos reported by visitors. */
export async function PhotoModeration() {
  const admin = createAdminClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  const [{ data: pendingGallery }, { data: reports }] = await Promise.all([
    admin
      .from('profile_gallery_images')
      .select('id, storage_path, caption, trade_profile_id, created_at')
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: true }),
    admin
      .from('photo_reports')
      .select('id, gallery_image_id, featured_image_id, reason, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: true }),
  ])

  const galleryIds = (reports ?? []).map(r => r.gallery_image_id as string | null).filter((v): v is string => !!v)
  const featuredIds = (reports ?? []).map(r => r.featured_image_id as string | null).filter((v): v is string => !!v)

  const [{ data: gImgs }, { data: fImgs }] = await Promise.all([
    galleryIds.length
      ? admin.from('profile_gallery_images').select('id, storage_path, caption').in('id', galleryIds)
      : Promise.resolve({ data: [] as { id: string; storage_path: string; caption: string | null }[] }),
    featuredIds.length
      ? admin.from('featured_job_images').select('id, storage_path, caption').in('id', featuredIds)
      : Promise.resolve({ data: [] as { id: string; storage_path: string; caption: string | null }[] }),
  ])
  const pathById = new Map<string, { path: string; caption: string | null }>()
  for (const i of [...(gImgs ?? []), ...(fImgs ?? [])]) {
    pathById.set(i.id as string, { path: i.storage_path as string, caption: i.caption as string | null })
  }

  const pending = pendingGallery ?? []
  const open = reports ?? []

  return (
    <>
      <section>
        <h2 className="text-xl font-bold text-gray-900">Reported photos</h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">{open.length} open report{open.length === 1 ? '' : 's'}</p>
        {open.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">No reported photos.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            {open.map(r => {
              const imageId = (r.gallery_image_id ?? r.featured_image_id) as string
              const img = pathById.get(imageId)
              return (
                <div key={r.id as string} className="flex gap-4 px-5 py-4">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${img.path}`} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs text-gray-400">{r.gallery_image_id ? 'Profile gallery' : 'Confirmed job photo'}</p>
                    <p className="text-sm text-gray-700">{(r.reason as string | null) || 'No reason given.'}</p>
                    <PhotoButtons mode="report" id={r.id as string} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900">Gallery photos to check</h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">
          {pending.length} photo{pending.length === 1 ? '' : 's'} that automatic checks could not decide.
        </p>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">Nothing waiting.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            {pending.map(p => (
              <div key={p.id as string} className="flex gap-4 px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${p.storage_path as string}`} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm text-gray-700">{(p.caption as string | null) || 'No caption.'}</p>
                  <PhotoButtons mode="moderate" id={p.id as string} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
