'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteMatchesUser } from '@/lib/invite-match'
import { jobLabel } from '@/lib/trade-types'

export type DeclineJobResult = { success: true } | { success: false; error: string }

export async function declineJobInvite(token: string): Promise<DeclineJobResult> {
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

  const [{ error }] = await Promise.all([
    admin.from('job_invites').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', invite.id),
    admin.from('jobs').update({ status: 'cancelled' }).eq('id', invite.job_id).eq('status', 'pending_confirmation'),
  ])
  if (error) return { success: false, error: 'Could not decline this request. Please try again.' }

  await admin.from('notifications').insert({
    user_id: invite.inviter_id,
    type: 'job_confirmed',
    title: 'Job request declined',
    body: `${person.full_name} has declined the ${job ? jobLabel(job.job_type as string) : 'job'} you logged. If that is a mistake, speak to them and log it again.`,
    link: '/dashboard',
  })

  revalidatePath('/dashboard')
  return { success: true }
}
