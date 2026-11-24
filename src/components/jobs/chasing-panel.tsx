import type { createAdminClient } from '@/lib/supabase/admin'
import { setChasing } from '@/actions/chasing'
import { SCHEDULE } from '@/lib/chasing/engine'
import { Card, LinkButton, Pill } from '@/components/ui'
import { ActionButton } from './action-button'
import type { JobBundle } from '@/lib/jobs/load'

type AdminClient = ReturnType<typeof createAdminClient>
const LABEL: Record<string, string> = { heads_up: 'Heads up', due_today: 'Due today', late_1: 'Late payment notice', late_2: 'Second notice', final: 'Final notice', lba_prompt: 'Letter before action prompt', review_window: 'Reviews opened' }

/** Chasing status and controls on the trade's job page (PRD 10, 18). */
export async function ChasingPanel({ admin, bundle }: { admin: AdminClient; bundle: JobBundle }) {
  const { job, stages } = bundle
  const due = stages.filter(s => !s.is_deposit && ['approved', 'requested_by_trade', 'part_paid', 'overdue'].includes(s.status) && s.amount_paid_pence < s.amount_pence)
  const { data: events } = await admin.from('chase_events').select('step, sent_at').eq('job_id', job.id).order('sent_at', { ascending: false }).limit(5)
  if (due.length === 0 && (events ?? []).length === 0) return null
  const status = job.chasing_stopped ? 'Stopped' : job.chasing_paused ? 'Paused' : due.length ? 'On' : 'Nothing due'
  const overdue21 = due.some(s => s.due_at && Date.now() - new Date(s.due_at).getTime() >= 21 * 86_400_000)
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-brand-navy">Chasing</h2>
        <Pill tone={status === 'On' ? 'green' : status === 'Nothing due' ? 'grey' : 'amber'}>{status}</Pill>
      </div>
      <p className="mt-1 text-sm text-gray-600">Reminders go by text and email in your business’s name: {SCHEDULE.filter(s => s.step !== 'lba_prompt' && s.step !== 'review_window').map(s => s.day < 0 ? `${-s.day} days before` : s.day === 0 ? 'on the due date' : `${s.day} days late`).join(', ')}. They stop the moment a payment arrives.</p>
      {(events ?? []).length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {(events ?? []).map((e, i) => <li key={i}>{LABEL[e.step as string] ?? e.step}: {new Date(e.sent_at as string).toLocaleDateString('en-GB')}</li>)}
        </ul>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!job.chasing_stopped && !job.chasing_paused && due.length > 0 && <ActionButton variant="outline" action={setChasing.bind(null, job.id, 'pause')}>Pause chasing</ActionButton>}
        {(job.chasing_paused || job.chasing_stopped) && <ActionButton variant="outline" action={setChasing.bind(null, job.id, 'resume')}>Resume chasing</ActionButton>}
        {!job.chasing_stopped && due.length > 0 && <ActionButton variant="ghost" confirm="Stop all chasing on this job?" action={setChasing.bind(null, job.id, 'stop')}>Stop chasing</ActionButton>}
        {overdue21 && <LinkButton href={`/jobs/${job.id}/letter`} variant="navy">Letter before action</LinkButton>}
      </div>
    </Card>
  )
}
