'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'
import { normaliseBusinessName, normalisePhone, normaliseEmail, sha256 } from '@/lib/seeded-hash'
import type { SeededProfile } from '@/types/database'

export type CreateSeededProfileInput = {
  business_name: string
  trade_category: string
  operating_areas: string[]
  contact_phone: string | null
  contact_email: string | null
  source_note: string | null
}

export type CreateSeededProfileResult =
  | { success: true; profile: SeededProfile }
  | { success: false; error: string; code: 'unauthorized' | 'do_not_reseed' | 'validation' | 'server_error' }

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export async function createSeededProfile(
  input: CreateSeededProfileInput,
): Promise<CreateSeededProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.', code: 'unauthorized' }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!userData?.is_admin) {
    return { success: false, error: 'Admin access required.', code: 'unauthorized' }
  }

  const businessName = input.business_name.trim()
  if (!businessName) {
    return { success: false, error: 'Business name is required.', code: 'validation' }
  }
  if (!(TRADE_TYPES as readonly string[]).includes(input.trade_category)) {
    return { success: false, error: 'Please select a valid trade category.', code: 'validation' }
  }
  if (input.operating_areas.length === 0) {
    return { success: false, error: 'At least one operating area is required.', code: 'validation' }
  }

  // ── do_not_reseed check (fail closed) ─────────────────────────
  const normName = normaliseBusinessName(businessName)
  const phoneHash = input.contact_phone ? sha256(normalisePhone(input.contact_phone)) : null
  const emailHash = input.contact_email ? sha256(normaliseEmail(input.contact_email)) : null

  const { data: nameMatch, error: nameErr } = await admin
    .from('do_not_reseed')
    .select('id')
    .eq('business_name_normalised', normName)
    .maybeSingle()
  if (nameErr) {
    console.error('do_not_reseed name query error:', nameErr)
    return { success: false, error: 'Could not verify the do-not-reseed list. Please try again.', code: 'server_error' }
  }
  if (nameMatch) {
    return { success: false, error: 'This business is on the do-not-reseed list.', code: 'do_not_reseed' }
  }

  if (phoneHash) {
    const { data: phoneMatch, error: phoneErr } = await admin
      .from('do_not_reseed')
      .select('id')
      .eq('phone_hash', phoneHash)
      .maybeSingle()
    if (phoneErr) {
      console.error('do_not_reseed phone query error:', phoneErr)
      return { success: false, error: 'Could not verify the do-not-reseed list. Please try again.', code: 'server_error' }
    }
    if (phoneMatch) {
      return { success: false, error: 'This phone number is on the do-not-reseed list.', code: 'do_not_reseed' }
    }
  }

  if (emailHash) {
    const { data: emailMatch, error: emailErr } = await admin
      .from('do_not_reseed')
      .select('id')
      .eq('email_hash', emailHash)
      .maybeSingle()
    if (emailErr) {
      console.error('do_not_reseed email query error:', emailErr)
      return { success: false, error: 'Could not verify the do-not-reseed list. Please try again.', code: 'server_error' }
    }
    if (emailMatch) {
      return { success: false, error: 'This email address is on the do-not-reseed list.', code: 'do_not_reseed' }
    }
  }

  // ── Unique slug ───────────────────────────────────────────────
  const baseSlug = slugify(businessName)
  let slug = baseSlug
  let attempt = 0

  while (true) {
    const candidate = attempt === 0 ? slug : `${baseSlug}-${attempt}`

    const [{ data: tp }, { data: sp }] = await Promise.all([
      admin.from('trade_profiles').select('id').eq('public_slug', candidate).maybeSingle(),
      admin.from('seeded_profiles').select('id').eq('slug', candidate).maybeSingle(),
    ])

    if (!tp && !sp) {
      slug = candidate
      break
    }

    attempt++
    if (attempt > 99) {
      return { success: false, error: 'Could not generate a unique slug.', code: 'server_error' }
    }
  }

  const claimToken = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const { data: inserted, error: insertError } = await admin
    .from('seeded_profiles')
    .insert({
      slug,
      business_name: businessName,
      trade_category: input.trade_category,
      operating_areas: input.operating_areas.map(a => a.trim().toUpperCase()),
      contact_phone: input.contact_phone || null,
      contact_email: input.contact_email || null,
      source_note: input.source_note || null,
      claim_token: claimToken,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (insertError || !inserted) {
    console.error('create-seeded-profile insert error:', insertError)
    return { success: false, error: 'Failed to create the listing. Please try again.', code: 'server_error' }
  }

  // Day 0 outreach is handled by the cron (initial_invite_sent_at IS NULL).
  // No fire-and-forget here — this keeps creation synchronous and the cron responsible.

  return { success: true, profile: inserted as unknown as SeededProfile }
}
