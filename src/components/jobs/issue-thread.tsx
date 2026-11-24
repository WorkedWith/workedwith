import { PhotoStrip } from './photo-strip'
import { IssueNoteForm } from './stage-forms'
import type { IssueNote, StageIssue } from '@/types/v42'

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** The issue notes are the only back and forth on the platform for a stage (PRD 9). */
export function IssueThread({ issues, urls, viewerId, canReply }: { issues: (StageIssue & { notes: IssueNote[] })[]; urls: Map<string, string>; viewerId: string; canReply: boolean }) {
  if (issues.length === 0) return null
  return (
    <div className="mt-3 space-y-3">
      {issues.map(i => (
        <div key={i.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Issue raised {fmt(i.created_at)}{i.status !== 'open' ? `, ${i.status === 'resubmitted' ? 'resubmitted' : i.status === 'resolved' ? 'resolved' : 'payment requested'}` : ''}</p>
          <p className="mt-1 text-sm text-gray-900">{i.reason}</p>
          <PhotoStrip paths={i.photo_paths} urls={urls} />
          {i.notes.map(n => (
            <div key={n.id} className={`mt-2 rounded-lg p-2 text-sm ${n.author_user_id === viewerId ? 'bg-white' : 'bg-blue-50'}`}>
              <p className="text-xs text-gray-500">{n.author_user_id === viewerId ? 'You' : 'Them'}, {fmt(n.created_at)}</p>
              <p>{n.note}</p>
              <PhotoStrip paths={n.photo_paths} urls={urls} />
            </div>
          ))}
          {canReply && i.status === 'open' && <div className="mt-2"><IssueNoteForm issueId={i.id} /></div>}
        </div>
      ))}
    </div>
  )
}
