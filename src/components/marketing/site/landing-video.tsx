/**
 * The landing video (PRD 19 item 11). Shows only when NEXT_PUBLIC_LANDING_VIDEO_URL is set, so the page
 * never shows an empty player before the new intro is ready.
 */
export function LandingVideo({ title = 'See how WorkedWith works' }: { title?: string }) {
  const src = process.env.NEXT_PUBLIC_LANDING_VIDEO_URL
  if (!src) return null
  const poster = process.env.NEXT_PUBLIC_LANDING_VIDEO_POSTER || undefined
  return (
    <section className="bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">{title}</h2>
        <video controls playsInline preload="metadata" poster={poster} className="mt-6 aspect-video w-full rounded-2xl bg-brand-navy shadow-lg">
          <source src={src} />
        </video>
      </div>
    </section>
  )
}
