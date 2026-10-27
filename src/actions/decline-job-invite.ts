'use server'

import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send'
import { jobRequestDeclined } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteMatchesUser } from '@/lib/invite-match'
import { recordRequestOutcome } from '@/lib/request-outcomes'
import { jobLabel } from '@/lib/trade-types'
import type { DeclineReason } from '@/types/database'

export type DeclineJobResult = { success: true } | { success: false; error: string }

/** A trade logged a job and the client is declining it. A reason is always asked for (PRD v3.7). */
export async function declineJobInvite(token: string, reason: DeclineReason, note?: string): Promise<DeclineJobResult> {
  if (reason !== 'not_me' && reason !== 'wont_confirm') return { success: false, error: 'Please choose a reason.' }
  const cleanNote = (note ?? '').trim().slice(0, 300) || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: invite } = await admin.from('job_invites').select('*').eq('invite_token', token).maybeSingle()
  if (!invite) return { success: false, error: 'Request not found.' }
  if (invite.status !== 'pending') return { success: false, error: 'This request has already been dealt with.' }

  const { data: me } = await admin.from('users').select('email, phone, phone_verified, full_name').eq('id', user.id).single()
  if (!me) return { success: false, error: 'User not found.' }
  const person = me as unknown as { email: string | null; phone: string | null; phone_verified: boolean; full_name: string }
  if (!inviteMatchesUser({ contact_phone: invite.invitee_phone, contact_email: invite.invitee_email }, person)) {
    return { success: false, error: 'This request was sent to a different account.' }
  }

  const { data: job } = await admin.from('jobs').select('id, job_type').eq('id', invite.job_id).single()
  const nowIso = new Date().toISOString()

  const [{ error }] = await Promise.all([
    admin.from('job_invites').update({
      status: 'declined',
      responded_at: nowIso,
      decline_reason: reason,
      decline_note: cleanNote,
      declined_at: nowIso,
      declined_by_user_id: user.id,
    }).eq('id', invite.id),
    admin.from('jobs').update({ status: 'cancelled' }).eq('id', invite.job_id).eq('status', 'pending_confirmation'),
  ])
  if (error) return { success: false, error: 'Could not decline this request. Please try again.' }

  await recordRequestOutcome(admin, {
    kind: 'job_invite',
    requestId: invite.id as string,
    recipientId: user.id,
    requesterId: invite.inviter_id as string,
    outcome: reason,
    requestedAt: (invite.sent_at as string | null) ?? nowIso,
  })

  const jobType = job ? (job.job_type as string) : 'job'
  await admin.from('notifications').insert({
    user_id: invite.inviter_id,
    type: 'job_confirmed',
    title: 'Job request declined',
    body: `${person.full_name} has not confirmed the ${jobLabel(jobType)} you logged. If it did happen, you can send proof within 30 days.`,
    link: `/requests/${invite.id}/evidence`,
  })

  const { data: requester } = await admin.from('users').select('email').eq('id', invite.inviter_id).maybeSingle()
  if (requester?.email) {
    const r = await sendEmail(requester.email as string, jobRequestDeclined({
      name: person.full_name, jobType, notMe: reason === 'not_me', requestId: invite.id as string,
    }))
    if (!r.ok) console.error('Decline email failed (non-fatal):', r.error)
  }

  revalidatePath('/dashboard')
  return { success: true }
}
