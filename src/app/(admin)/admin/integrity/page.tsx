import { createAdminClient } from '@/lib/supabase/admin'
import { IntegrityFlagActions } from './integrity-actions'

export const metadata = { title: 'Integrity Flags — WorkedWith Admin' }

const flagLabels: Record<string, string> = {
  same_ip_both_parties: 'Same IP — both parties',
  same_device_both_parties: 'Same device — both parties',
  velocity_spike: 'Review velocity spike',
  postcode_distance_anomaly: 'Postcode distance anomaly',
  new_accounts_both_parties: 'New accounts — both parties',
}

export default async function IntegrityPage() {
  const admin = createAdminClient()

  const { data: rawFlags } = await admin
    .from('review_integrity_flags')
    .select('*')
    .eq('outcome', 'pending')
    .order('flagged_at', { ascending: false })
    .limit(200)

  const flags = rawFlags ?? []

  // Fetch associated jobs for context
  const jobIds = Array.from(new Set(flags.map(f => f.job_id).filter(Boolean))) as string[]
  const { data: rawJobs } = jobIds.length > 0
    ? await admin.from('jobs').select('id, job_type, postcode, confirmed_at').in('id', jobIds)
    : { data: [] }

  const jobMap = new Map((rawJobs ?? []).map(j => [j.id as string, j]))

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrity Flags</h1>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
          {flags.length} pending
        </span>
      </div>

      {flags.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-500">No pending integrity flags</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map(flag => {
            const job = flag.job_id ? jobMap.get(flag.job_id) : undefined
            return (
              <div key={flag.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        {flagLabels[flag.flag_type as string] ?? flag.flag_type}
                      </span>
                      {job && (
                        <span className="text-xs text-gray-500">
                          {job.job_type as string} · {job.postcode as string}
                        </span>
                      )}
                    </div>

                    {flag.details && (
                      <p className="mt-2 text-sm text-gray-600 break-all">{flag.details as string}</p>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>Flagged {new Date(flag.flagged_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {flag.job_id && (
                        <a href={`/jobs/${flag.job_id}`} className="text-brand-amber hover:underline" target="_blank" rel="noopener noreferrer">
                          View job →
                        </a>
                      )}
                    </div>
                  </div>

                  <IntegrityFlagActions flagId={flag.id as string} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
