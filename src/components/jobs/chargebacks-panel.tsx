import type { createAdminClient } from '@/lib/supabase/admin'
import { formatPence } from '@/lib/money'
import { Card, Notice } from '@/components/ui'
import { ChargebackEvidenceForm } from './chargeback-evidence-form'

type AdminClient = ReturnType<typeof createAdminClient>

/** Chargebacks on the trade's job page, with the evidence built from the job record (PRD 9). */
export async function ChargebacksPanel({ admin, jobId }: { admin: AdminClient; jobId: string }) {
  const { data } = await admin.from('chargebacks').select('*').eq('job_id', jobId).order('opened_at', { ascending: false })
  if (!data?.length) return null
  return (
    <Card className="border-2 border-red-200">
      <h2 className="text-lg font-bold text-red-900">Card payment disputed</h2>
      {data.map(cb => (
        <div key={cb.id} className="mt-3 space-y-2">
          <p className="text-sm text-gray-800">{formatPence(cb.amount_pence)} disputed{cb.reason ? ` (${String(cb.reason).replace(/_/g, ' ')})` : ''}. {cb.evidence_due_at ? `Evidence due by ${new Date(cb.evidence_due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.` : ''}</p>
          {cb.outcome ? <Notice tone={cb.outcome === 'won' ? 'green' : 'red'}>{cb.outcome === 'won' ? 'You won this dispute.' : cb.outcome === 'lost' ? 'Lost: the payment went back to the client and the stage is due again.' : 'Closed.'}</Notice>
            : cb.evidence_submitted_at ? <Notice tone="blue">Evidence submitted. Stripe will tell you the outcome.</Notice>
              : <ChargebackEvidenceForm chargebackId={cb.id} />}
        </div>
      ))}
    </Card>
  )
}
