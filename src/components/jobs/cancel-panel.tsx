import { depositPosition } from '@/lib/jobs/cancel'
import { confirmMadeToMeasure } from '@/actions/stages'
import { Card, Notice } from '@/components/ui'
import { ActionButton } from './action-button'
import { CancelJobForm } from './cancel-job-form'
import type { JobBundle } from '@/lib/jobs/load'

/** Cancel with a reason, and where the deposit stands (PRD 9). Both sides. */
export function CancelPanel({ bundle, role }: { bundle: JobBundle; role: 'trade' | 'client' }) {
  const { job, current, stages } = bundle
  const deposit = stages.find(s => s.is_deposit) ?? null
  if (job.status === 'cancelled') {
    const pos = depositPosition(job, current, deposit, new Date(job.cancelled_at ?? Date.now()))
    return (
      <Card>
        <h2 className="text-base font-bold text-brand-navy">Cancelled</h2>
        <p className="mt-1 text-sm text-gray-700">Reason: {job.cancellation_reason}</p>
        {pos.outcome !== 'none' && (
          <div className="mt-3 space-y-2">
            <Notice tone={job.deposit_outcome === 'refund_due' ? 'amber' : 'blue'}>
              {job.deposit_outcome === 'refund_due' ? 'Deposit refund due. ' : job.deposit_outcome === 'refunded' ? 'Deposit refunded. ' : ''}{pos.explanation}
            </Notice>
            {role === 'trade' && pos.outcome === 'needs_trade_answer' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <ActionButton variant="outline" action={confirmMadeToMeasure.bind(null, job.id, true)}>Materials were made to measure</ActionButton>
                <ActionButton variant="outline" action={confirmMadeToMeasure.bind(null, job.id, false)}>They were not</ActionButton>
              </div>
            )}
            {role === 'trade' && job.deposit_outcome === 'refund_due' && <p className="text-sm text-gray-600">Send the refund from your bank, then use Mark refunded on the deposit payment above.</p>}
            <p className="text-xs text-gray-500">Either of you can raise a dispute over the deposit by contacting WorkedWith.</p>
          </div>
        )}
      </Card>
    )
  }
  const cancellable = ['booked', 'in_progress', 'completed'].includes(job.status) || (job.status === 'quoted' && current?.status === 'accepted')
  if (!cancellable) return null
  return (
    <details className="rounded-2xl border border-gray-200 bg-white p-5">
      <summary className="min-h-[36px] cursor-pointer text-sm font-semibold text-gray-700">Cancel this job</summary>
      <div className="mt-3"><CancelJobForm jobId={job.id} /></div>
    </details>
  )
}
