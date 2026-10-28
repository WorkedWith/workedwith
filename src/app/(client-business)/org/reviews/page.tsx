import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/org-access'
import { BackLink } from '@/components/back-link'
import { ReviewResponse } from '@/components/review-response'

export const metadata = { title: 'Business reviews | WorkedWith' }

type Row = {
  id: string; reviewer_id: string | null; overall_rating: number | null; written_review: string | null
  submitted_at: string; dispute_status: string | null; response_text: string | null
}

export default async function OrgReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const admin = createAdminClient()
  const ctx = await getOrgContext(admin, user.id)
  if (!ctx) redirect('/dashboard')

  const { data } = await admin
    .from('reviews')
    .select('id, reviewer_id, overall_rating, written_review, submitted_at, dispute_status, response_text')
    .eq('reviewee_id', ctx.identityUserId)
    .eq('reviewee_type', 'client')
    .eq('is_visible', true)
    .order('submitted_at', { ascending: false })
    .limit(100)
  const reviews = (data ?? []) as unknown as Row[]

  const reviewerIds = Array.from(new Set(reviews.map(r => r.reviewer_id).filter((x): x is string => !!x)))
  const { data: tps } = reviewerIds.length
    ? await admin.from('trade_profiles').select('user_id, company_name').in('user_id', reviewerIds)
    : { data: [] }
  const nameOf = new Map(((tps ?? []) as unknown as { user_id: string; company_name: string | null }[]).map(t => [t.user_id, t.company_name ?? 'A tradesperson']))

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <BackLink href="/org/dashboard" label="Business dashboard" />
      <h1 className="mt-2 text-2xl font-bold text-brand-navy">{ctx.org.company_name}: reviews</h1>
      <p className="mt-1 text-sm text-gray-600">
        Reviews from trades about the business.
        {ctx.canManage ? ' Owners and admins can reply once to each, or dispute within 14 days.' : ' Owners and admins can reply or dispute.'}
      </p>
      {reviews.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">No published reviews yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map(r => {
            const closed = Date.now() - new Date(r.submitted_at).getTime() > 14 * 86_400_000
            return (
              <li key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-amber-600">{r.overall_rating ? `${r.overall_rating} / 5` : 'No rating'}</span>
                  <span className="text-xs text-gray-500">{new Date(r.submitted_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                </div>
                {r.written_review && <p className="mt-2 text-sm leading-relaxed text-gray-700">{r.written_review}</p>}
                <p className="mt-2 text-xs text-gray-500">{(r.reviewer_id && nameOf.get(r.reviewer_id)) || 'A tradesperson'} · Confirmed by both sides</p>
                <ReviewResponse reviewId={r.id} responseText={r.response_text} responderName={ctx.org.company_name} canRespond={ctx.canManage} />
                {ctx.canManage && !r.response_text && r.dispute_status === 'none' && !closed && (
                  <p className="mt-1 text-xs">
                    <Link href={`/reviews/${r.id}/dispute`} className="font-semibold text-gray-500 underline">Dispute this review</Link>
                  </p>
                )}
                {r.dispute_status && r.dispute_status !== 'none' && <p className="mt-1 text-xs font-semibold text-amber-700">Dispute raised</p>}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
