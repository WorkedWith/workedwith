import type { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui'

type AdminClient = ReturnType<typeof createAdminClient>

/** The client's record next to the quote (PRD 14). Phase 9 replaces this with the full record. */
export async function ClientRecordPanel({ admin, clientUserId }: { admin: AdminClient; clientUserId: string | null }) {
  if (!clientUserId) return null
  const { data: cp } = await admin.from('client_profiles').select('average_rating, total_reviews, red_flag_count').eq('user_id', clientUserId).maybeSingle()
  if (!cp) return null
  return (
    <Card>
      <h2 className="text-base font-bold text-brand-navy">Client record</h2>
      <p className="mt-1 text-sm text-gray-600">
        {(cp.total_reviews as number) > 0
          ? `Rated ${Number(cp.average_rating).toFixed(1)} by trades from ${cp.total_reviews} reviewed ${cp.total_reviews === 1 ? 'job' : 'jobs'}.`
          : 'No reviews from trades yet.'}
        {(cp.red_flag_count as number) > 0 && ` ${cp.red_flag_count} red ${cp.red_flag_count === 1 ? 'flag' : 'flags'}.`}
      </p>
    </Card>
  )
}
