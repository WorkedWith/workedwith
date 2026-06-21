import { createAdminClient } from '@/lib/supabase/admin'
import { DisputeQueue } from '@/components/admin/dispute-queue'
import type { DisputeEnriched } from '@/components/admin/dispute-queue'
import type { Dispute, Review, User } from '@/types/database'

export const metadata = { title: 'Disputes — WorkedWith Admin' }

export default async function DisputesPage() {
  const admin = createAdminClient()

  const { data: rawDisputes } = await admin
    .from('disputes')
    .select('*')
    .eq('admin_decision', 'pending')
    .order('is_priority', { ascending: false })
    .order('decision_deadline', { ascending: true })

  const disputes = (rawDisputes ?? []) as unknown as Dispute[]

  if (disputes.length === 0) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Disputes</h1>
        <DisputeQueue disputes={[]} />
      </div>
    )
  }

  // Fetch related reviews
  const reviewIds = Array.from(new Set(disputes.map(d => d.review_id)))
  const { data: rawReviews } = await admin
    .from('reviews')
    .select('id, written_review, is_visible, job_id')
    .in('id', reviewIds)
  const reviews = (rawReviews ?? []) as unknown as (Pick<Review, 'written_review' | 'is_visible' | 'job_id'> & { id: string })[]

  // Fetch raiser + respondent users
  const userIds = Array.from(new Set([
    ...disputes.map(d => d.raised_by),
    ...disputes.map(d => d.respondent_id),
  ]))
  const { data: rawUsers } = await admin
    .from('users')
    .select('id, full_name, email')
    .in('id', userIds)
  const users = (rawUsers ?? []) as Pick<User, 'id' | 'full_name' | 'email'>[]

  const enriched: DisputeEnriched[] = disputes.map(d => ({
    ...d,
    review: reviews.find(r => r.id === d.review_id) ?? null,
    raiser: users.find(u => u.id === d.raised_by) ?? null,
    respondent: users.find(u => u.id === d.respondent_id) ?? null,
  }))

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {disputes.length} open dispute{disputes.length === 1 ? '' : 's'} — Pro priority first, then by deadline.
        </p>
      </div>
      <DisputeQueue disputes={enriched} />
    </div>
  )
}
