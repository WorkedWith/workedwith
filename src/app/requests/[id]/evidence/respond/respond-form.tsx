'use client'

import { useState } from 'react'
import { uploadEvidenceFile, respondToEvidenceClaim, confirmFromEvidenceClaim } from '@/actions/evidence'
import { EVIDENCE_TYPES, EVIDENCE_TYPE_LABEL, MAX_EVIDENCE_FILES, MAX_EVIDENCE_FILE_BYTES, STATEMENT_MAX } from '@/lib/evidence'
import type { EvidenceType } from '@/types/database'

type Picked = { file: File; type: EvidenceType }
const OK_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']

export function RespondForm({ claimId }: { claimId: string }) {
  const [statement, setStatement] = useState('')
  const [files, setFiles] = useState<Picked[]>([])
  const [busy, setBusy] = useState<'respond' | 'confirm' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function addFiles(list: FileList | null) {
    if (!list) return
    setError(null)
    const next = [...files]
    for (const f of Array.from(list)) {
      if (next.length >= MAX_EVIDENCE_FILES) { setError(`You can add up to ${MAX_EVIDENCE_FILES} files.`); break }
      if (!OK_TYPES.includes(f.type)) { setError('Only photos (JPG, PNG, WebP) and PDFs are accepted.'); continue }
      if (f.size > MAX_EVIDENCE_FILE_BYTES) { setError('Each file must be 4 MB or smaller.'); continue }
      next.push({ file: f, type: 'messages' })
    }
    setFiles(next)
  }

  async function respond(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (statement.trim().length < 5) { setError('Please tell us your side.'); return }
    setBusy('respond')
    try {
      for (const p of files) {
        const fd = new FormData()
        fd.set('claimId', claimId)
        fd.set('evidenceType', p.type)
        fd.set('file', p.file)
        const up = await uploadEvidenceFile(fd)
        if (!up.success) { setError(up.error); return }
      }
      const r = await respondToEvidenceClaim(claimId, statement)
      if (!r.success) { setError(r.error); return }
      window.location.reload()
    } finally {
      setBusy(null)
    }
  }

  async function confirmJob() {
    setError(null)
    setBusy('confirm')
    try {
      const r = await confirmFromEvidenceClaim(claimId)
      if (!r.success) { setError(r.error); return }
      window.location.href = '/dashboard'
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={confirmJob} disabled={busy !== null}
        className="min-h-[48px] w-full rounded-xl bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50">
        {busy === 'confirm' ? 'Confirming…' : 'Confirm the job'}
      </button>

      <div className="flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200" />or give your side<span className="h-px flex-1 bg-gray-200" /></div>

      <form onSubmit={respond} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Your side
          <textarea value={statement} onChange={e => setStatement(e.target.value.slice(0, STATEMENT_MAX))} rows={4} maxLength={STATEMENT_MAX}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber" />
          <span className="block text-right text-xs font-normal text-gray-400">{statement.length}/{STATEMENT_MAX}</span>
        </label>

        <div>
          <p className="text-sm font-medium text-gray-700">Anything to back it up? (optional)</p>
          <ul className="mt-2 space-y-2">
            {files.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-gray-700">{p.file.name}</span>
                <select value={p.type} onChange={e => setFiles(files.map((q, j) => (j === i ? { ...q, type: e.target.value as EvidenceType } : q)))}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" aria-label="What this file is">
                  {EVIDENCE_TYPES.map(t => <option key={t} value={t}>{EVIDENCE_TYPE_LABEL[t]}</option>)}
                </select>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-xs font-medium text-red-600">Remove</button>
              </li>
            ))}
          </ul>
          {files.length < MAX_EVIDENCE_FILES && (
            <label className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-dashed border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Add a file
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="sr-only" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
            </label>
          )}
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <button type="submit" disabled={busy !== null}
          className="min-h-[48px] w-full rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {busy === 'respond' ? 'Sending…' : 'Send my side'}
        </button>
      </form>
    </div>
  )
}
