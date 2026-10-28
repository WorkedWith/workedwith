import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Reviews — WorkedWith Admin' }

type PageProps = { searchParams: Promise<{ view?: string; q?: string }> }

type Row = {
  id: string; job_id: string; reviewer_id: string | null; reviewee_id: string; reviewer_type: string | null
  overall_rating: number | null; written_review: string | null; is_visible: boolean; is_backdated: boolean
  dispute_status: string | null; response_text: string | null; red_flag: boolean; submitted_at: string
}

const VIEWS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hidden', label: 'Hidden (blind)' },
  { key: 'published', label: 'Published' },
  { key: 'disputed', label: 'Disputed' },
  { key: 'redflag', label: 'Red flagged' },
  { key: 'responded', label: 'With a response' },
]

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const { view = 'all', q = '' } = await searchParams
  const admin = createAdminClient()

  // Look up by email first, if given
  let personId: string | null = null
  if (q.trim()) {
    const { data: u } = await admin.from('users').select('id').ilike('email', q.trim()).maybeSingle()
    personId = (u as { id: string } | null)?.id ?? null
  }

  let query = admin
    .from('reviews')
    .select('id, job_id, reviewer_id, reviewee_id, reviewer_type, overall_rating, written_review, is_visible, is_backdated, dispute_status, response_text, red_flag, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(100)
  if (view === 'hidden') query = query.eq('is_visible', false)
  if (view === 'published') query = query.eq('is_visible', true)
  if (view === 'disputed') query = query.neq('dispute_status', 'none')
  if (view === 'redflag') query = query.eq('red_flag', true)
  if (view === 'responded') query = query.not('response_text', 'is', null)
  if (q.trim() && personId) query = query.or(`reviewer_id.eq.${personId},reviewee_id.eq.${personId}`)

  const { data } = q.trim() && !personId ? { data: [] } : await query
  const rows = (data ?? []) as unknown as Row[]

  const ids = Array.from(new Set(rows.flatMap(r => [r.reviewer_id, r.reviewee_id]).filter((x): x is string => !!x)))
  const { data: us } = ids.length ? await admin.from('users').select('id, full_name, email').in('id', ids) : { data: [] }
  const who = new Map(((us ?? []) as unknown as { id: string; full_name: string | null; email: string | null }[]).map(u => [u.id, `${u.full_name ?? 'Unnamed'} (${u.email ?? 'no email'})`]))

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy">Reviews</h1>
      <p className="mt-1 text-sm text-gray-600">Read only. Hidden reviews are shown here for admins only. Disputes and flags are handled in their own queues.</p>

      <form className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={q} placeholder="Find by a person's exact email" className="min-w-[16rem] rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {VIEWS.map(v => (
          <Link key={v.key} href={`/admin/reviews?view=${v.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${view === v.key ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {v.label}
          </Link>
        ))}
      </div>

      {q.trim() && !personId && <p className="mt-4 text-sm text-gray-500">No user with that email.</p>}
      <p className="mt-4 text-xs text-gray-500">{rows.length} shown (latest 100)</p>
      <ul className="mt-2 space-y-3">
        {rows.map(r => (
          <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${r.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{r.is_visible ? 'Published' : 'Hidden'}</span>
              {r.dispute_status && r.dispute_status !== 'none' && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">Dispute {r.dispute_status}</span>}
              {r.red_flag && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">Red flag</span>}
              {r.is_backdated && <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">Past job</span>}
              <span className="text-gray-500">{fmt(r.submitted_at)}</span>
              <span className="font-semibold text-amber-600">{r.overall_rating ?? '-'} / 5</span>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              <span className="font-semibold">From:</span> {r.reviewer_id ? who.get(r.reviewer_id) : 'Closed account'}{' '}
              <span className="font-semibold">About:</span> {who.get(r.reviewee_id) ?? 'Unknown'}
            </p>
            {r.written_review && <p className="mt-2 text-gray-800">{r.written_review}</p>}
            {r.response_text && <p className="mt-2 border-l-4 border-gray-300 pl-2 text-xs text-gray-600">Response: {r.response_text}</p>}
            <p className="mt-2 text-xs text-gray-400">Job {r.job_id}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
