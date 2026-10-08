'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteMatchesUser } from '@/lib/invite-match'
import { jobLabel } from '@/lib/trade-types'
import type { PendingInvite } from '@/types/database'

export type DeclineResult = { success: true } | { success: false; error: string }

export async function declineTradeInvite(claimToken: string): Promise<DeclineResult> {
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

  const { error } = await admin.from('pending_invites').update({ status: 'declined' }).eq('id', invite.id)
  if (error) return { success: false, error: 'Could not decline this request. Please try again.' }

  await admin.from('notifications').insert({
    user_id: invite.inviting_client_id,
    type: 'job_confirmed',
    title: 'Job request declined',
    body: `${person.full_name} has said they did not do this ${jobLabel(invite.job_type)} with you. If that is a mistake, speak to them and send a new request.`,
    link: '/dashboard',
  })

  revalidatePath('/dashboard')
  return { success: true }
}
