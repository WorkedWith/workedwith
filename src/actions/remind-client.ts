'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { jobToConfirmExisting, jobInviteNewClient } from '@/lib/email/templates'
import { outwardCode } from '@/lib/email/format'

export type RemindClientResult = { success: true } | { success: false; error: string }

const MAX_REMINDERS = 2
const MIN_HOURS_BETWEEN = 48

/** Sends the original confirm email again. Trade owner only, pending jobs only, limited. */
export async function remindClient(jobId: string): Promise<RemindClientResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in again.' }

  const admin = createAdminClient()

  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (!job || !job.trade_profile_id) return { success: false, error: 'Job not found.' }
  if (job.status !== 'pending_confirmation') return { success: false, error: 'This job is no longer waiting for confirmation.' }

  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('id, user_id, company_name')
    .eq('id', job.trade_profile_id)
    .maybeSingle()
  if (!tradeProfile || tradeProfile.user_id !== user.id) return { success: false, error: 'Job not found.' }

  const { data: invite } = await admin.from('job_invites').select('*').eq('job_id', jobId).maybeSingle()
  if (!invite || invite.status !== 'pending' || !invite.invite_token) {
    return { success: false, error: 'There is no open invite for this job.' }
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'The invite has expired. Log the job again to send a new one.' }
  }

  const sent = (invite.reminder_count as number | null) ?? 0
  if (sent >= MAX_REMINDERS) {
    return { success: false, error: 'You have already sent two reminders. Try getting in touch with them directly.' }
  }
  const last = invite.last_reminded_at as string | null
  if (last && Date.now() - new Date(last).getTime() < MIN_HOURS_BETWEEN * 3600 * 1000) {
    return { success: false, error: 'You reminded them recently. Give it a couple of days.' }
  }

  // Work out where to send it, and whether they already have an account
  let existing: { id: string; email: string } | null = null
  if (invite.invitee_email) {
    const { data } = await admin.from('users').select('id, email').eq('email', invite.invitee_email).maybeSingle()
    if (data) existing = { id: data.id as string, email: data.email as string }
  } else if (invite.invitee_phone) {
    const { data } = await admin.from('users').select('id, email').eq('phone', invite.invitee_phone).maybeSingle()
    if (data) existing = { id: data.id as string, email: data.email as string }
  }
  const emailTo = (invite.invitee_email as string | null) ?? existing?.email ?? null
  if (!emailTo) {
    return { success: false, error: 'We only have a phone number for this client, so we cannot email a reminder. Send them a message yourself.' }
  }

  const { data: tradeUser } = await admin.from('users').select('full_name').eq('id', user.id).maybeSingle()
  const tradeName = (tradeProfile.company_name as string | null) ?? (tradeUser?.full_name as string | undefined) ?? 'Your tradesperson'
  const postcode = (job.postcode as string | null) ?? ''
  const token = invite.invite_token as string

  const content = existing
    ? jobToConfirmExisting({ tradeName, jobType: job.job_type as string, postcode, token })
    : jobInviteNewClient({ tradeName, jobType: job.job_type as string, district: outwardCode(postcode), token })

  const r = await sendEmail(emailTo, content)
  if (!r.ok) return { success: false, error: 'The email could not be sent. Please try again.' }

  await admin
    .from('job_invites')
    .update({ last_reminded_at: new Date().toISOString(), reminder_count: sent + 1 })
    .eq('id', invite.id)

  revalidatePath(`/jobs/${jobId}`)
  return { success: true }
}
