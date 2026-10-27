import { createAdminClient } from '@/lib/supabase/admin'
import type { RequestKind, RequestOutcomeKind } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

/** Rate is hidden until a user has at least this many counted requests (PRD v3.7). */
export const CONFIRMATION_THRESHOLD = 5

/** "Confirmed 18 of 20 job requests", or null while there is not enough to show. */
export function confirmationLabel(counted: number | null | undefined, confirmed: number | null | undefined): string | null {
  const c = counted ?? 0
  if (c < CONFIRMATION_THRESHOLD) return null
  return `Confirmed ${confirmed ?? 0} of ${c} job requests`
}

export const CONFIRMATION_TOOLTIP_TRADE =
  'How often this trade confirms jobs other people log with them, over the last 2 years.'
export const CONFIRMATION_TOOLTIP_CLIENT =
  'How often this client confirms jobs other people log with them, over the last 2 years.'

/**
 * Records what happened to a request the user received, then refreshes their cached rate.
 * Writing again for the same request replaces the outcome (used when a decline is overturned).
 * Never throws.
 */
export async function recordRequestOutcome(
  admin: AdminClient,
  p: {
    kind: RequestKind
    requestId: string
    recipientId: string
    requesterId: string | null
    outcome: RequestOutcomeKind
    requestedAt: string
  },
): Promise<void> {
  try {
    const { error } = await admin.from('request_outcomes').upsert(
      {
        request_kind: p.kind,
        request_id: p.requestId,
        recipient_id: p.recipientId,
        requester_id: p.requesterId,
        outcome: p.outcome,
        requested_at: p.requestedAt,
        resolved_at: new Date().toISOString(),
      },
      { onConflict: 'request_kind,request_id' },
    )
    if (error) {
      console.error('recordRequestOutcome failed (non-fatal):', error.message)
      return
    }
    const { error: rpcErr } = await admin.rpc('refresh_confirmation_stats', { p_user: p.recipientId })
    if (rpcErr) console.error('refresh_confirmation_stats failed (non-fatal):', rpcErr.message)
  } catch (err) {
    console.error('recordRequestOutcome error (non-fatal):', err)
  }
}

/** Finds the account a request was addressed to by its contact details, if they had one. */
export async function findRecipientUserId(
  admin: AdminClient,
  contact: { email: string | null; phone: string | null },
): Promise<string | null> {
  if (contact.email) {
    const { data } = await admin.from('users').select('id').ilike('email', contact.email).maybeSingle()
    if (data?.id) return data.id as string
  }
  if (contact.phone) {
    const { data } = await admin.from('users').select('id').eq('phone', contact.phone).eq('phone_verified', true).maybeSingle()
    if (data?.id) return data.id as string
  }
  return null
}
