'use server'

import { APP_URL } from '@/lib/app-url'
import { randomBytes } from 'crypto'
import twilio from 'twilio'
import { sendEmail } from '@/lib/email/send'
import { tradeInviteFromClient } from '@/lib/email/templates'
import { tradeInviteSms } from '@/lib/sms-copy'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_TRADE_TERMS, parentTrade } from '@/lib/trade-types'
import { normaliseBusinessName } from '@/lib/seeded-hash'
import { tradeAlreadyKnown, cleanReferenceUrl, LISTINGS_PER_CLIENT_PER_30_DAYS } from '@/lib/client-listings'

// ── Types ─────────────────────────────────────────────────────

export type InviteTradeInput = {
  trade_name: string
  job_type: string
  description?: string
  job_date: string
  contact_phone?: string
  contact_email?: string
  /** Set when the client agreed to add the trade to the directory. */
  listing?: { district: string; reference_url?: string }
}

/** Asked before sending: is this trade already known, so we do not offer a directory listing? */
export async function checkTradeKnown(input: { trade_name: string; contact_email?: string; contact_phone?: string }): Promise<{ known: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { known: true }
  const admin = createAdminClient()
  const phone = input.contact_phone ? normalizeUKMobile(input.contact_phone.trim()) : null
  return { known: await tradeAlreadyKnown(admin, { name: input.trade_name, email: input.contact_email, phone }) }
}

export type InviteTradeResult =
  | { success: true; inviteId: string; stackedCount: number; warning?: string; listingAdded?: boolean }
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
  if (!job_type || !(ALL_TRADE_TERMS as readonly string[]).includes(job_type)) {
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

  // Optional: add the trade to the directory, subject to admin approval
  let listingAdded = false
  if (input.listing) {
    listingAdded = await submitListing(admin, {
      clientId: user.id,
      inviteId: invite.id as string,
      businessName: trade_name,
      jobType: job_type,
      district: input.listing.district,
      referenceUrl: input.listing.reference_url,
      email: contact_email,
      phone: contact_phone,
    })
  }

  // If already notified, skip sending (stacked against existing thread)
  if (alreadyNotified) {
    return { success: true, inviteId: invite.id, stackedCount, listingAdded }
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

  return { success: true, inviteId: invite.id, stackedCount: 0, warning, listingAdded }
}

const DISTRICT_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/

/** Creates a pending submission and links the invite to it. Returns false if it could not be added; the invite is unaffected. */
async function submitListing(
  admin: ReturnType<typeof createAdminClient>,
  p: { clientId: string; inviteId: string; businessName: string; jobType: string; district: string; referenceUrl?: string; email: string | null; phone: string | null },
): Promise<boolean> {
  const district = p.district.trim().toUpperCase().replace(/\s+/g, '')
  if (!DISTRICT_RE.test(district)) return false
  const name = normaliseBusinessName(p.businessName)

  if (await tradeAlreadyKnown(admin, { name: p.businessName, email: p.email, phone: p.phone })) return false

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { count: recent } = await admin.from('client_listing_submissions').select('id', { count: 'exact', head: true }).eq('client_id', p.clientId).gte('created_at', since)
  if ((recent ?? 0) >= LISTINGS_PER_CLIENT_PER_30_DAYS) return false

  const { count: rejectedBefore } = await admin.from('client_listing_submissions').select('id', { count: 'exact', head: true })
    .eq('client_id', p.clientId).eq('business_name_normalised', name).eq('district', district).eq('status', 'rejected')
  if ((rejectedBefore ?? 0) > 0) return false

  const { data: sub } = await admin.from('client_listing_submissions').insert({
    client_id: p.clientId,
    business_name: p.businessName,
    business_name_normalised: name,
    trade_category: parentTrade(p.jobType) ?? p.jobType,
    district,
    public_reference_url: cleanReferenceUrl(p.referenceUrl),
  }).select('id').single()
  if (!sub) return false
  await admin.from('pending_invites').update({ listing_submission_id: sub.id as string }).eq('id', p.inviteId)
  return true
}
