'use server'

import twilio from 'twilio'
import { revalidatePath } from 'next/cache'
import { APP_URL } from '@/lib/app-url'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { tradeInviteFromClient } from '@/lib/email/templates'
import { tradeInviteSms } from '@/lib/sms-copy'
import type { PendingInvite } from '@/types/database'

export type RemindTradeResult = { success: true } | { success: false; error: string }

const MAX_REMINDERS = 2
const MIN_HOURS_BETWEEN = 72

/** A client nudges a trade who has not answered their request. Same message as the first one, limited. */
export async function remindTrade(inviteId: string): Promise<RemindTradeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in again.' }

  const admin = createAdminClient()
  const { data: raw } = await admin.from('pending_invites').select('*').eq('id', inviteId).maybeSingle()
  const inv = raw as unknown as PendingInvite | null
  if (!inv || inv.inviting_client_id !== user.id) return { success: false, error: 'Request not found.' }
  if (inv.status !== 'sent' || new Date(inv.expires_at) < new Date()) {
    return { success: false, error: 'This request is no longer open.' }
  }
  // Client added directory listings never get outreach, and job link requests came from the trade
  if (inv.listing_submission_id || inv.source !== 'client_invite') {
    return { success: false, error: 'This request cannot be sent again. Get in touch with them yourself.' }
  }
  if (inv.reminder_count >= MAX_REMINDERS) {
    return { success: false, error: 'You have already sent two reminders. Try getting in touch with them directly.' }
  }
  if (inv.last_reminded_at && Date.now() - new Date(inv.last_reminded_at).getTime() < MIN_HOURS_BETWEEN * 3_600_000) {
    return { success: false, error: 'You reminded them recently. Give it a few days.' }
  }

  const [{ data: me }, { data: cp }] = await Promise.all([
    admin.from('users').select('full_name').eq('id', user.id).single(),
    admin.from('client_profiles').select('display_name, company_name').eq('user_id', user.id).maybeSingle(),
  ])
  const c = cp as { display_name: string | null; company_name: string | null } | null
  const callerName = c?.display_name ?? c?.company_name ?? (me?.full_name as string | undefined) ?? 'A client'
  const claimUrl = `${APP_URL}/invite/claim/${inv.claim_token}`
  const daysLeft = Math.max(1, Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86_400_000))

  // Mark first so a double click cannot send twice
  const { error: upErr } = await admin
    .from('pending_invites')
    .update({ reminder_count: inv.reminder_count + 1, last_reminded_at: new Date().toISOString() })
    .eq('id', inv.id)
    .eq('reminder_count', inv.reminder_count)
  if (upErr) return { success: false, error: 'Could not send the reminder. Please try again.' }

  if (inv.contact_email) {
    const r = await sendEmail(inv.contact_email, tradeInviteFromClient({ callerName, jobType: inv.job_type, jobDate: inv.job_date, claimUrl, days: daysLeft }))
    if (!r.ok) console.error('Reminder email failed (non-fatal):', r.error)
  }
  if (inv.contact_phone && process.env.TWILIO_MESSAGING_SERVICE_SID) {
    try {
      const tw = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
      await tw.messages.create({
        body: tradeInviteSms({ callerName, jobType: inv.job_type, token: inv.claim_token, days: daysLeft }),
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: inv.contact_phone,
      })
    } catch (e) {
      console.error('Reminder SMS failed (non-fatal):', e)
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
