'use client'

import { useState, useTransition } from 'react'
import { sendVariation } from '@/actions/variations'
import { MoneyInput } from '@/components/quotes/money-input'
import { PhotoPicker } from '@/components/quotes/photo-picker'
import { Button, ErrorText, Input, Label, Select, TextArea } from '@/components/ui'

/** Add a variation from site, fully usable on a phone (PRD 8, 18). */
export function VariationForm({ jobId, stages }: { jobId: string; stages: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState(0)
  const [reduction, setReduction] = useState(false)
  const [note, setNote] = useState('')
  const [target, setTarget] = useState(stages[0]?.id ?? 'new')
  const [newName, setNewName] = useState('')
  const [paths, setPaths] = useState<string[]>([])
  const [pv, setPv] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (!open) return <Button type="button" onClick={() => setOpen(true)}>+ Add a variation</Button>
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4">
      <div><Label htmlFor="vd">What is changing</Label><Input id="vd" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Extra socket in the kitchen" /></div>
      <div className="grid grid-cols-2 gap-2">
        {[false, true].map(r => (
          <button key={String(r)} type="button" onClick={() => setReduction(r)} className={`min-h-[44px] rounded-xl border-2 text-sm font-semibold ${reduction === r ? 'border-brand-amber bg-amber-50' : 'border-gray-200 text-gray-600'}`}>
            {r ? 'Takes money off' : 'Adds to the price'}
          </button>
        ))}
      </div>
      <div><Label htmlFor="va">Price</Label><MoneyInput id="va" valuePence={amount} onChange={setAmount} /></div>
      <div>
        <Label htmlFor="vs" hint="Usually the next stage or the final one.">Add it to</Label>
        <Select id="vs" value={target} onChange={e => setTarget(e.target.value)}>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          {!reduction && <option value="new">A new stage of its own</option>}
        </Select>
      </div>
      {target === 'new' && <div><Label htmlFor="vn">New stage name</Label><Input id="vn" value={newName} onChange={e => setNewName(e.target.value)} placeholder={desc || 'Extra work'} /></div>}
      <PhotoPicker folder="variations" paths={paths} previews={pv} onChange={(p, v) => { setPaths(p); setPv(v) }} label="Add photos" />
      <TextArea rows={2} aria-label="Note" placeholder="Note for the client (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <Button type="button" full disabled={pending} onClick={() => {
        setError(null)
        start(async () => {
          const r = await sendVariation({ jobId, description: desc, amountPence: reduction ? -amount : amount, note, photoPaths: paths, targetStageId: target, newStageName: newName })
          if (r.ok) window.location.reload()
          else setError(r.error)
        })
      }}>{pending ? 'Sending…' : 'Send to the client to approve'}</Button>
      <button type="button" onClick={() => setOpen(false)} className="min-h-[40px] text-sm text-gray-500 underline">Cancel</button>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
