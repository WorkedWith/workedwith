import type { createAdminClient } from '@/lib/supabase/admin'
import { signedPhotoUrls } from '@/lib/photos'
import { LABEL_TEXT, type ReviewLabel } from '@/lib/reviews/windows'
import { Card, Pill } from '@/components/ui'
import { PhotoStrip } from '@/components/jobs/photo-strip'
import { JobReviewForm } from './job-review-form'
import type { JobBundle } from '@/lib/jobs/load'
import type { Review } from '@/types/database'
import type { JobReviewInput } from '@/actions/job-reviews'

type AdminClient = ReturnType<typeof createAdminClient>
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

function toInput(r: Review, paths: string[]): Partial<JobReviewInput> {
  return {
    overall: r.overall_rating ?? 0, communication: r.communication_score ?? undefined, quality: r.quality_score ?? undefined,
    reliability: r.reliability_score ?? undefined, value: r.value_score ?? undefined, payment: r.payment_score ?? undefined,
    scopeClarity: r.scope_clarity_score ?? undefined, siteAccess: r.site_access_score ?? undefined, redFlag: r.red_flag,
    redFlagReason: r.red_flag_reason, wouldWorkAgain: r.would_work_again, text: r.written_review ?? '', photoPaths: paths,
  }
}

/** The review once open (PRD 13, 18), on both job pages. */
export async function JobReviewPanel({ admin, bundle, userId, role }: { admin: AdminClient; bundle: JobBundle; userId: string; role: 'trade' | 'client' }) {
  const { data: w } = await admin.from('review_windows').select('*').eq('job_id', bundle.job.id).eq('flow', 'quote').maybeSingle()
  if (!w) return null
  const { data: rs } = await admin.from('reviews').select('*').eq('job_id', bundle.job.id)
  const reviews = (rs ?? []) as unknown as Review[]
  const { data: ph } = reviews.length ? await admin.from('review_photos').select('review_id, path').in('review_id', reviews.map(r => r.id)) : { data: [] }
  const photosBy = new Map<string, string[]>()
  for (const p of ph ?? []) photosBy.set(p.review_id as string, [...(photosBy.get(p.review_id as string) ?? []), p.path as string])
  const urls = new Map((await signedPhotoUrls(admin, (ph ?? []).map(p => p.path as string))).map(x => [x.path, x.url]))

  const mine = reviews.find(r => r.reviewer_id === userId)
  const theirs = reviews.find(r => r.reviewer_id !== userId)
  const open = !w.closed_at && w.window_closes_at && new Date(w.window_closes_at) > new Date()
  const published = reviews.filter(r => r.is_visible)

  return (
    <div id="review">
      <Card>
        <h2 className="text-lg font-bold text-brand-navy">Reviews</h2>
        {open && !mine && (
          <>
            <p className="mt-1 text-sm text-gray-600">You have until {fmt(w.window_closes_at as string)}. Neither review shows until both are in or the 14 days end, then they publish together.</p>
            <div className="mt-4"><JobReviewForm jobId={bundle.job.id} role={role} initial={null} initialPhotos={{}} /></div>
          </>
        )}
        {open && mine && !theirs && (
          <>
            <p className="mt-1 text-sm text-gray-600">Your review is saved and hidden. You can change it until they submit theirs or {fmt(w.window_closes_at as string)}.</p>
            <details className="mt-3">
              <summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-brand-navy">Edit my review</summary>
              <div className="mt-3"><JobReviewForm jobId={bundle.job.id} role={role} initial={toInput(mine, photosBy.get(mine.id) ?? [])} initialPhotos={Object.fromEntries((photosBy.get(mine.id) ?? []).map(p => [p, urls.get(p) ?? '']))} /></div>
            </details>
          </>
        )}
        {!open && published.length === 0 && <p className="mt-1 text-sm text-gray-600">The review window has closed with no reviews.</p>}
        {published.map(r => (
          <article key={r.id} className="mt-4 rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">{r.reviewer_id === userId ? 'Your review' : 'Their review of you'}</p>
              <span className="flex items-center gap-2">
                {r.label && <Pill tone={r.label === 'paid_job' ? 'green' : r.label === 'unpaid' ? 'red' : 'grey'}>{LABEL_TEXT[r.label as ReviewLabel]}</Pill>}
                <span className="text-brand-amber" aria-label={`${r.overall_rating} out of 5`}>{'★'.repeat(r.overall_rating ?? 0)}<span className="text-gray-300">{'★'.repeat(5 - (r.overall_rating ?? 0))}</span></span>
              </span>
            </div>
            {r.written_review && <p className="mt-2 text-sm text-gray-700">{r.written_review}</p>}
            <PhotoStrip paths={photosBy.get(r.id) ?? []} urls={urls} />
            {r.response_text && <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-700"><span className="font-semibold">Response:</span> {r.response_text}</p>}
            {r.reviewee_id === userId && (
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {!r.response_text && <a href={`/reviews/${r.id}/respond`} className="min-h-[40px] font-semibold text-brand-navy underline">Respond (300 characters)</a>}
                <a href={`/reviews/${r.id}/dispute`} className="min-h-[40px] text-gray-600 underline">Dispute this review</a>
              </div>
            )}
          </article>
        ))}
      </Card>
    </div>
  )
}
