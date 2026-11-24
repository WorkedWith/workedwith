'use client'

import { useState, useTransition } from 'react'
import { addIssueNote, markPaidElsewhere, markPaymentReceived, markStageDone, raiseStageIssue, requestPaymentAnyway } from '@/actions/stages'
import { PhotoPicker } from '@/components/quotes/photo-picker'
import { Button, ErrorText, Input, Label, Select, TextArea } from '@/components/ui'

type R = { ok: boolean; error?: string }

function useRun() {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<R>) => {
    setError(null)
    start(async () => {
      const r = await fn()
      if (r.ok) window.location.reload()
      else setError(r.error ?? 'Something went wrong.')
    })
  }
  return { pending, error, run }
}

function Toggle({ label, children, variant = 'primary' }: { label: string; children: React.ReactNode; variant?: 'primary' | 'outline' | 'ghost' }) {
  const [open, setOpen] = useState(false)
  if (!open) return <Button type="button" variant={variant} onClick={() => setOpen(true)}>{label}</Button>
  return <div className="w-full space-y-3 rounded-xl border border-gray-200 p-3">{children}<button type="button" onClick={() => setOpen(false)} className="min-h-[40px] text-sm text-gray-500 underline">Cancel</button></div>
}

/** Mark done (or resubmit) with at least one photo, usable one handed on site. */
export function MarkDoneForm({ stageId, resubmit }: { stageId: string; resubmit?: boolean }) {
  const [paths, setPaths] = useState<string[]>([])
  const [pv, setPv] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const { pending, error, run } = useRun()
  return (
    <Toggle label={resubmit ? 'Fixed: resubmit with photos' : 'Mark done with photos'}>
      <PhotoPicker folder="stages" paths={paths} previews={pv} onChange={(p, v) => { setPaths(p); setPv(v) }} label="Take or add photos" />
      <TextArea rows={2} aria-label="Note (optional)" placeholder="Note for the client (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <Button type="button" full disabled={pending || paths.length === 0} onClick={() => run(() => markStageDone(stageId, paths, note))}>{pending ? 'Sending…' : 'Send to the client to approve'}</Button>
      <ErrorText>{error}</ErrorText>
    </Toggle>
  )
}

export function RequestAnywayForm({ stageId }: { stageId: string }) {
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  const { pending, error, run } = useRun()
  return (
    <Toggle label="Request payment anyway" variant="outline">
      <p className="text-sm text-gray-700">This makes the stage due and starts chasing. It will always show to both of you, on the invoice and on any letter as &ldquo;Payment requested by the trade. Not approved by the client&rdquo;.</p>
      <TextArea rows={2} aria-label="Note" placeholder="Why you are requesting payment" value={note} onChange={e => setNote(e.target.value)} />
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5" checked={confirm} onChange={e => setConfirm(e.target.checked)} />I confirm the work for this stage is complete.</label>
      <Button type="button" full disabled={pending || !confirm} onClick={() => run(() => requestPaymentAnyway(stageId, note, confirm))}>Request payment</Button>
      <ErrorText>{error}</ErrorText>
    </Toggle>
  )
}

export function MarkPaidForm({ stageId, balance }: { stageId: string; balance: string }) {
  const [amount, setAmount] = useState(balance)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [how, setHow] = useState<'bank' | 'cash' | 'cheque' | 'other_account'>('bank')
  const { pending, error, run } = useRun()
  return (
    <Toggle label="Mark payment received" variant="outline">
      <div className="grid gap-3 sm:grid-cols-3">
        <div><Label htmlFor={`amt-${stageId}`}>Amount</Label><Input id={`amt-${stageId}`} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div>
        <div><Label htmlFor={`dt-${stageId}`}>Date</Label><Input id={`dt-${stageId}`} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label htmlFor={`how-${stageId}`}>How</Label>
          <Select id={`how-${stageId}`} value={how} onChange={e => setHow(e.target.value as typeof how)}>
            <option value="bank">Bank transfer to my account</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="other_account">A different account</option>
          </Select>
        </div>
      </div>
      {how !== 'bank' && <p className="text-xs text-gray-500">The client is asked to confirm. It counts on their record once they do.</p>}
      <Button type="button" full disabled={pending} onClick={() => run(() => how === 'bank' ? markPaymentReceived(stageId, amount, date) : markPaidElsewhere(stageId, amount, date, how))}>Save payment</Button>
      <ErrorText>{error}</ErrorText>
    </Toggle>
  )
}

export function IssueNoteForm({ issueId, label = 'Reply' }: { issueId: string; label?: string }) {
  const [note, setNote] = useState('')
  const [paths, setPaths] = useState<string[]>([])
  const [pv, setPv] = useState<Record<string, string>>({})
  const { pending, error, run } = useRun()
  return (
    <Toggle label={label} variant="ghost">
      <TextArea rows={2} aria-label="Note" value={note} onChange={e => setNote(e.target.value)} />
      <PhotoPicker folder="issues" paths={paths} previews={pv} max={5} onChange={(p, v) => { setPaths(p); setPv(v) }} label="Add photos" />
      <Button type="button" full disabled={pending} onClick={() => run(() => addIssueNote(issueId, note, paths))}>Send note</Button>
      <ErrorText>{error}</ErrorText>
    </Toggle>
  )
}

export function RaiseIssueForm({ stageId }: { stageId: string }) {
  const [reason, setReason] = useState('')
  const [paths, setPaths] = useState<string[]>([])
  const [pv, setPv] = useState<Record<string, string>>({})
  const { pending, error, run } = useRun()
  return (
    <Toggle label="Something isn’t right" variant="outline">
      <TextArea rows={3} aria-label="What is wrong" placeholder="Tell the trade what needs fixing" value={reason} onChange={e => setReason(e.target.value)} />
      <PhotoPicker folder="issues" paths={paths} previews={pv} max={5} onChange={(p, v) => { setPaths(p); setPv(v) }} label="Add photos" />
      <Button type="button" full variant="navy" disabled={pending} onClick={() => run(() => raiseStageIssue(stageId, reason, paths))}>Raise the issue</Button>
      <ErrorText>{error}</ErrorText>
    </Toggle>
  )
}
