'use server'

import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { jobRequestDeclined } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteMatchesUser } from '@/lib/invite-match'
import { recordRequestOutcome } from '@/lib/request-outcomes'
import { jobLabel } from '@/lib/trade-types'
import type { DeclineReason, PendingInvite } from '@/types/database'

export type DeclineResult = { success: true } | { success: false; error: string }

/** A client says they used a trade and the trade is declining. A reason is always asked for (PRD v3.7). */
export async function declineTradeInvite(claimToken: string, reason: DeclineReason, note?: string): Promise<DeclineResult> {
  if (reason !== 'not_me' && reason !== 'wont_confirm') return { success: false, error: 'Please choose a reason.' }
  const cleanNote = (note ?? '').trim().slice(0, 300) || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: raw } = await admin.from('pending_invites').select('*').eq('claim_token', claimToken).maybeSingle()
  if (!raw) return { success: false, error: 'Request not found.' }
  const invite = raw as unknown as PendingInvite
  if (invite.status !== 'sent') return { success: false, error: 'This request has already been dealt with.' }

  const { data: me } = await admin.from('users').select('email, phone, phone_verified, full_name').eq('id', user.id).single()
  if (!me) return { success: false, error: 'User not found.' }
  const person = me as unknown as { email: string | null; phone: string | null; phone_verified: boolean; full_name: string }
  if (!inviteMatchesUser(invite, person)) {
    return { success: false, error: 'This request was sent to a different account.' }
  }

  const nowIso = new Date().toISOString()
  const { error } = await admin.from('pending_invites').update({
    status: 'declined',
    decline_reason: reason,
    decline_note: cleanNote,
    declined_at: nowIso,
    declined_by_user_id: user.id,
  }).eq('id', invite.id)
  if (error) return { success: false, error: 'Could not decline this request. Please try again.' }

  await recordRequestOutcome(admin, {
    kind: 'pending_invite',
    requestId: invite.id,
    recipientId: user.id,
    requesterId: invite.inviting_client_id,
    outcome: reason,
    requestedAt: invite.created_at,
  })

  await admin.from('notifications').insert({
    user_id: invite.inviting_client_id,
    type: 'job_confirmed',
    title: 'Job request declined',
    body: `${person.full_name} has not confirmed the ${jobLabel(invite.job_type)} you logged. If it did happen, you can send proof within 30 days.`,
    link: `/requests/${invite.id}/evidence`,
  })

  const { data: requester } = await admin.from('users').select('email').eq('id', invite.inviting_client_id).maybeSingle()
  if (requester?.email) {
    const r = await sendEmail(requester.email as string, jobRequestDeclined({
      name: person.full_name, jobType: invite.job_type, notMe: reason === 'not_me', requestId: invite.id,
    }))
    if (!r.ok) console.error('Decline email failed (non-fatal):', r.error)
  }

  revalidatePath('/dashboard')
  return { success: true }
}
