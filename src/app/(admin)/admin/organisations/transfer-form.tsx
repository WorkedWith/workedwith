'use client'

import { useState, useTransition } from 'react'
import { transferOrgRecord } from '@/actions/admin/transfer-org-record'

export type MemberOption = { id: string; label: string }

export function TransferForm({ orgId, members }: { orgId: string; members: MemberOption[] }) {
  const [pending, start] = useTransition()
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!to) return
    const who = members.find(m => m.id === to)?.label ?? 'this member'
    if (!window.confirm(`Move the business record to ${who}? Its jobs, reviews and client profile move with it.`)) return
    start(async () => {
      const r = await transferOrgRecord(orgId, to, note)
      setMsg(r.success ? { ok: true, text: 'Record moved.' } : { ok: false, text: r.error })
    })
  }

  if (members.length === 0) return null
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-brand-navy">Move the business record</summary>
      <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
        <select value={to} onChange={e => setTo(e.target.value)} disabled={pending} className="rounded-lg border border-gray-300 px-2 py-2 text-xs">
          <option value="">New holder…</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <input value={note} onChange={e => setNote(e.target.value)} disabled={pending} maxLength={300} placeholder="Reason (optional)" className="min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-2 py-2 text-xs" />
        <button disabled={pending || !to} className="rounded-lg bg-brand-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{pending ? 'Moving…' : 'Move'}</button>
      </form>
      {msg && <p role="status" className={`mt-1 text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
    </details>
  )
}
