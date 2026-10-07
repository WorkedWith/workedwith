'use server'

import { APP_URL } from '@/lib/app-url'
import { randomBytes } from 'crypto'
import twilio from 'twilio'
import { sendEmail } from '@/lib/email/send'
import { tradeInviteFromClient } from '@/lib/email/templates'
import { tradeInviteSms } from '@/lib/sms-copy'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'

// ── Types ─────────────────────────────────────────────────────

export type InviteTradeInput = {
  trade_name: string
  job_type: string
  description?: string
  job_date: string
  contact_phone?: string
  contact_email?: string
}

export type InviteTradeResult =
  | { success: true; inviteId: string; stackedCount: number; warning?: string }
  | { success: false; error: string; field?: keyof InviteTradeInput }

// ── Helpers ───────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeUKMobile(raw: string): string | null {
  const c = raw.replace(/[\s\-().]/g, '')
  if (/^\+447\d{9}$/.test(c)) return c
  if (/^07\d{9}$/.test(c)) return '+44' + c.slice(1)
  return null
}

// ── Action ────────────────────────────────────────────────────

export async function inviteTrade(input: InviteTradeInput): Promise<InviteTradeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()
  if (!userData) return { success: false, error: 'User not found.' }
  if (!userData.phone_verified) {
    return { success: false, error: 'Phone verification is required to send invites.' }
  }

  // Must be a client
  const { data: clientProfile } = await admin
    .from('client_profiles')
    .select('id, display_name, company_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clientProfile) {
    return { success: false, error: 'A client profile is required to invite tradespeople.' }
  }

  // Normalise
  const trade_name = input.trade_name.trim()
  const job_type = input.job_type.trim()
  const description = input.description?.trim() || null
  const job_date = input.job_date.trim()
  const contact_email = input.contact_email?.trim().toLowerCase() || null
  const contact_phone_raw = input.contact_phone?.trim() || null
  const contact_phone = contact_phone_raw ? normalizeUKMobile(contact_phone_raw) : null

  // Validate
  if (!trade_name) {
    return { success: false, error: 'Please enter the trade or company name.', field: 'trade_name' }
  }
  if (trade_name.length > 100) {
    return { success: false, error: 'Trade name must be 100 characters or fewer.', field: 'trade_name' }
  }
  if (!job_type || !(TRADE_TYPES as readonly string[]).includes(job_type)) {
    return { success: false, error: 'Please select a valid job type.', field: 'job_type' }
  }
  if (!job_date) {
    return { success: false, error: 'Please select the approximate job date.', field: 'job_date' }
  }
  if (description && description.length > 500) {
    return { success: false, error: 'Description must be 500 characters or fewer.', field: 'description' }
  }
  if (!contact_email && !contact_phone_raw) {
    return { success: false, error: 'Please enter an email address or mobile number.', field: 'contact_email' }
  }
  if (contact_email && !EMAIL_RE.test(contact_email)) {
    return { success: false, error: 'Please enter a valid email address.', field: 'contact_email' }
  }
  if (contact_phone_raw && !contact_phone) {
    return {
      success: false,
      error: 'Please enter a valid UK mobile number (e.g. 07700 900000).',
      field: 'contact_phone',
    }
  }

  // Rate limit: max 10 sent (unclaimed) invites per client per 24 hours
  const { count: recentCount } = await admin
    .from('pending_invites')
    .select('id', { count: 'exact', head: true })
    .eq('inviting_client_id', user.id)
    .eq('status', 'sent')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((recentCount ?? 0) >= 10) {
    return { success: false, error: 'You can send up to 10 invites per day. Try again tomorrow.' }
  }

  // Dedup: check for existing unclaimed invites to the same contact
  // If found, still create the record but skip re-sending the notification
  let stackedCount = 0
  let phoneStacked = false
  let emailStacked = false

  if (contact_phone) {
    const { data: existing } = await admin
      .from('pending_invites')
      .select('id')
      .eq('contact_phone', contact_phone)
      .eq('status', 'sent')
    if (existing && existing.length > 0) {
      stackedCount = existing.length
      phoneStacked = true
    }
  }

  if (contact_email) {
    const { data: existing } = await admin
      .from('pending_invites')
      .select('id')
      .eq('contact_email', contact_email)
      .eq('status', 'sent')
    if (existing && existing.length > 0) {
      stackedCount = Math.max(stackedCount, existing.length)
      emailStacked = true
    }
  }

  // Skip notifying only when every contact method given has already been notified.
  // A new email or phone on a stacked invite still gets its own message.
  const alreadyNotified =
    (!contact_phone || phoneStacked) && (!contact_email || emailStacked)

  // Insert pending invite
  const claim_token = randomBytes(32).toString('hex')
  const { data: invite, error: insertErr } = await admin
    .from('pending_invites')
    .insert({
      inviting_client_id: user.id,
      trade_name,
      job_type,
      description,
      job_date,
      contact_phone: contact_phone ?? null,
      contact_email: contact_email ?? null,
      claim_token,
    })
    .select('*')
    .single()

  if (insertErr || !invite) {
    return { success: false, error: 'Failed to create invite. Please try again.' }
  }

  // If already notified, skip sending (stacked against existing thread)
  if (alreadyNotified) {
    return { success: true, inviteId: invite.id, stackedCount }
  }

  // Send notifications
  const claimUrl = `${APP_URL}/invite/claim/${invite.claim_token}`
  const callerName =
    (clientProfile as { display_name: string | null; company_name: string | null }).display_name ??
    (clientProfile as { display_name: string | null; company_name: string | null }).company_name ??
    userData.full_name
  const sends: Promise<unknown>[] = []
  let smsFailed = false

  if (contact_phone && !phoneStacked && process.env.TWILIO_MESSAGING_SERVICE_SID) {
    try {
      const tw = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
      sends.push(
        tw.messages
          .create({
            body: tradeInviteSms({ callerName, jobType: job_type, token: invite.claim_token as string, days: 60 }),
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            to: contact_phone,
          })
          .catch((e: unknown) => {
            smsFailed = true
            console.error('SMS send failed (non-fatal):', e)
          }),
      )
    } catch (e) {
      smsFailed = true
      console.error('Twilio init failed:', e)
    }
  } else if (contact_phone && !phoneStacked) {
    smsFailed = true
    console.warn('TWILIO_MESSAGING_SERVICE_SID not configured, skipping invite SMS')
  }

  if (contact_email && !emailStacked) {
    sends.push(
      sendEmail(contact_email, tradeInviteFromClient({ callerName, jobType: job_type, jobDate: job_date, claimUrl, days: 60 })).then(r => {
        if (!r.ok) console.error('Email send failed (non-fatal):', r.error)
      }),
    )
  }

  await Promise.all(sends)

  const warning = smsFailed
    ? contact_email
      ? 'The invite was saved and emailed, but the text message could not be sent.'
      : 'The invite was saved, but the text message could not be sent. Please try again or add an email address.'
    : undefined

  return { success: true, inviteId: invite.id, stackedCount: 0, warning }
}
