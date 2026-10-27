import { createAdminClient } from '@/lib/supabase/admin'
import type { DeclineReason, EvidenceType, RequestKind } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

/** PRD v3.7 evidence route timings and limits. */
export const EVIDENCE_WINDOW_DAYS = 30
export const RESPONSE_DAYS = 7
export const DECISION_DAYS = 21
export const MAX_EVIDENCE_FILES = 5
export const MAX_EVIDENCE_FILE_BYTES = 4 * 1024 * 1024
export const MAX_CLAIMS_PER_30_DAYS = 3
export const FILE_RETENTION_DAYS = 30
export const STATEMENT_MAX = 500

export const EVIDENCE_TYPES: EvidenceType[] = ['invoice', 'bank_transfer', 'quote', 'messages', 'other']

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  invoice: 'Invoice',
  bank_transfer: 'Bank transfer',
  quote: 'Quote',
  messages: 'Messages',
  other: 'Other',
}

export const ALLOWED_EVIDENCE_MIME: Record<string, 'image' | 'pdf'> = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
}

export type RequestInfo = {
  kind: RequestKind
  id: string
  requesterId: string
  /** The person who declined. Null until someone has declined. */
  respondentId: string | null
  jobType: string
  jobId: string | null
  declined: boolean
  overturned: boolean
  declinedAt: string | null
  declineReason: DeclineReason | null
  requestedAt: string
}

/** Finds a request by id in either table and normalises it. */
export async function loadRequest(admin: AdminClient, id: string): Promise<RequestInfo | null> {
  const { data: pi } = await admin.from('pending_invites').select('*').eq('id', id).maybeSingle()
  if (pi) {
    return {
      kind: 'pending_invite',
      id: pi.id as string,
      requesterId: pi.inviting_client_id as string,
      respondentId: (pi.declined_by_user_id as string | null) ?? null,
      jobType: pi.job_type as string,
      jobId: (pi.resulting_job_id as string | null) ?? null,
      declined: pi.status === 'declined',
      overturned: !!pi.overturned_at,
      declinedAt: (pi.declined_at as string | null) ?? null,
      declineReason: (pi.decline_reason as DeclineReason | null) ?? null,
      requestedAt: pi.created_at as string,
    }
  }
  const { data: ji } = await admin.from('job_invites').select('*').eq('id', id).maybeSingle()
  if (ji) {
    const { data: job } = await admin.from('jobs').select('id, job_type').eq('id', ji.job_id).maybeSingle()
    return {
      kind: 'job_invite',
      id: ji.id as string,
      requesterId: ji.inviter_id as string,
      respondentId: (ji.declined_by_user_id as string | null) ?? null,
      jobType: (job?.job_type as string | undefined) ?? 'job',
      jobId: ji.job_id as string,
      declined: ji.status === 'declined',
      overturned: !!ji.overturned_at,
      declinedAt: (ji.declined_at as string | null) ?? null,
      declineReason: (ji.decline_reason as DeclineReason | null) ?? null,
      requestedAt: (ji.sent_at as string | null) ?? new Date().toISOString(),
    }
  }
  return null
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000)
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
