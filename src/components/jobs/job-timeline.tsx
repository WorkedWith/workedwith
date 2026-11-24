import type { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui'

type AdminClient = ReturnType<typeof createAdminClient>

/** Everything that has happened on the job, for both sides. */
export async function JobTimeline({ admin, jobId }: { admin: AdminClient; jobId: string }) {
  const { data } = await admin.from('job_events').select('id, summary, created_at').eq('job_id', jobId).order('created_at', { ascending: false }).limit(50)
  if (!data || data.length === 0) return null
  return (
    <Card>
      <details>
        <summary className="min-h-[36px] cursor-pointer text-base font-bold text-brand-navy">History ({data.length})</summary>
        <ol className="mt-3 space-y-2 border-l-2 border-gray-100 pl-4">
          {data.map(e => (
            <li key={e.id} className="text-sm">
              <span className="block text-gray-800">{e.summary}</span>
              <span className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </li>
          ))}
        </ol>
      </details>
    </Card>
  )
}
