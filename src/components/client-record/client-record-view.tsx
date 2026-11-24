import type { ClientRecord } from '@/lib/client-record/record'
import { Pill } from '@/components/ui'

/** The full client record (PRD 14). A "good payer" summary first, then figures, then reviews from trades. */
export function ClientRecordView({ r, forClient = false }: { r: ClientRecord; forClient?: boolean }) {
  const f = r.figures
  const good = f.unpaidJobs === 0 && f.stagesPaid > 0 && f.stagesPaidOnTime === f.stagesPaid
  const stat = (label: string, value: string | number) => (
    <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold tabular-nums text-brand-navy">{value}</p></div>
  )
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-4 ${good ? 'bg-green-50' : f.unpaidJobs > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{forClient ? 'Your record' : r.company ? `${r.company} (${r.name})` : r.name}</p>
        <p className={`mt-1 text-lg font-bold ${good ? 'text-green-900' : f.unpaidJobs > 0 ? 'text-red-900' : 'text-gray-900'}`}>{good ? `Good payer: ${r.summary}` : r.summary}</p>
        <p className="text-xs text-gray-500">On WorkedWith since {new Date(r.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat('Jobs completed', f.jobsCompleted)}
        {stat('Jobs fully paid', f.jobsFullyPaid)}
        {stat('Stages paid on time', `${f.stagesPaidOnTime} of ${f.stagesPaid}`)}
        {stat('Average days to pay', f.avgDaysToPay ?? 'None yet')}
        {stat('Paid only after the trade asked', f.paidAfterRequest)}
        {stat('Disputes', f.disputes)}
        {stat('Lost chargebacks', f.lostChargebacks)}
        {stat('Red flags', r.redFlagCount)}
      </div>
      <div>
        <p className="text-sm font-semibold text-brand-navy">Reviews from trades {r.reviewCount > 0 && <span className="font-normal text-gray-600">({r.rating.toFixed(1)} from {r.reviewCount})</span>}</p>
        {r.reviews.length === 0 ? <p className="mt-1 text-sm text-gray-500">No reviews from trades yet.</p> : (
          <ul className="mt-2 space-y-3">
            {r.reviews.map(rv => (
              <li key={rv.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-brand-amber">{'★'.repeat(rv.rating ?? 0)}<span className="text-gray-300">{'★'.repeat(5 - (rv.rating ?? 0))}</span></span>
                  <span className="flex items-center gap-2">{rv.label && <Pill tone={rv.label === 'Paid job' ? 'green' : rv.label === 'Unpaid' ? 'red' : 'grey'}>{rv.label}</Pill>}<span className="text-xs text-gray-500">{rv.trade}, {new Date(rv.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span></span>
                </div>
                {rv.text && <p className="mt-1 text-sm text-gray-700">{rv.text}</p>}
                {rv.photos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {rv.photos.map(u => <img key={u} src={u} alt="Photo from the review" className="h-16 w-16 rounded-lg object-cover" />)}
                  </div>
                )}
                {rv.response && <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm"><span className="font-semibold">{forClient ? 'Your response' : 'Client’s response'}:</span> {rv.response}</p>}
                {forClient && <a href={`/reviews/${rv.id}/${rv.response ? 'dispute' : 'respond'}`} className="mt-1 inline-flex min-h-[40px] items-center text-sm text-brand-navy underline">{rv.response ? 'Dispute this review' : 'Respond, or dispute this review'}</a>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!forClient && <p className="text-xs text-gray-500">Only from real WorkedWith jobs. Never public. You can see this because you are quoting this client or looked them up by their email or mobile.</p>}
    </div>
  )
}
