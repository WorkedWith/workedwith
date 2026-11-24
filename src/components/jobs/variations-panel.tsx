import type { createAdminClient } from '@/lib/supabase/admin'
import { signedPhotoUrls } from '@/lib/photos'
import { variationTargets } from '@/lib/variations/targets'
import { withdrawVariation } from '@/actions/variations'
import { formatPence } from '@/lib/money'
import { Card, Pill } from '@/components/ui'
import { ActionButton } from './action-button'
import { PhotoStrip } from './photo-strip'
import { VariationForm } from './variation-form'
import { VariationDecision } from './variation-decision'
import type { JobBundle } from '@/lib/jobs/load'
import type { Variation } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>
const LABEL = { sent: 'Waiting for the client', approved: 'Approved', declined: 'Declined', withdrawn: 'Withdrawn' }

/** Variations on the job page, for both sides (PRD 8). */
export async function VariationsPanel({ admin, bundle, role }: { admin: AdminClient; bundle: JobBundle; role: 'trade' | 'client' }) {
  const { job } = bundle
  const { data } = await admin.from('variations').select('*').eq('job_id', job.id).order('created_at', { ascending: false })
  const vars = (data ?? []) as Variation[]
  const canAdd = role === 'trade' && ['booked', 'in_progress'].includes(job.status)
  if (vars.length === 0 && !canAdd) return null
  const urls = new Map((await signedPhotoUrls(admin, vars.flatMap(v => v.photo_paths))).map(p => [p.path, p.url]))
  const targets = canAdd ? await variationTargets(admin, job.id) : []
  const pending = vars.filter(v => v.status === 'sent')

  return (
    <Card className={role === 'client' && pending.length ? 'border-2 border-brand-amber' : ''}>
      <h2 className="text-lg font-bold text-brand-navy">{role === 'client' && pending.length ? 'Changes to approve' : 'Variations'}</h2>
      {role === 'trade' && <p className="mt-1 text-sm text-gray-600">Extras or changes go to the client to approve before you do the work. You can’t change an approved variation; add a new one instead.</p>}
      <ul className="mt-3 space-y-3">
        {vars.map(v => (
          <li key={v.id} className="rounded-xl border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-gray-900">{v.description}</p>
              <span className="shrink-0 font-semibold tabular-nums">{v.amount_pence > 0 ? '+' : 'minus '}{formatPence(Math.abs(v.amount_pence))}</span>
            </div>
            <Pill tone={v.status === 'approved' ? 'green' : v.status === 'sent' ? 'amber' : 'grey'}>{LABEL[v.status]}</Pill>
            {v.note && <p className="mt-2 text-sm text-gray-700">{v.note}</p>}
            {v.decline_note && <p className="mt-2 text-sm text-gray-700">Client’s note: {v.decline_note}</p>}
            <PhotoStrip paths={v.photo_paths} urls={urls} />
            {role === 'client' && v.status === 'sent' && <VariationDecision variationId={v.id} />}
            {role === 'trade' && v.status === 'sent' && <div className="mt-2"><ActionButton variant="ghost" action={withdrawVariation.bind(null, v.id)}>Withdraw</ActionButton></div>}
          </li>
        ))}
      </ul>
      {canAdd && <div className="mt-3"><VariationForm jobId={job.id} stages={targets.map(t => ({ id: t.id, name: t.name }))} /></div>}
    </Card>
  )
}
