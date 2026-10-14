import type { GalleryImagePublic } from '@/actions/gallery/get-gallery-images'
import { ReportPhotoButton } from '@/components/report-photo-button'

type Props = { images: GalleryImagePublic[]; supabaseUrl: string }

export function GallerySection({ images, supabaseUrl }: Props) {
  if (images.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Photos of their work</h2>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map(img => (
            <li key={img.id} className="space-y-1.5">
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/featured-job-images/${img.storage_path}`}
                  alt={img.caption ?? 'Photo of their work'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              {img.caption && <p className="text-xs leading-relaxed text-gray-500">{img.caption}</p>}
              <ReportPhotoButton kind="gallery" imageId={img.id} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
