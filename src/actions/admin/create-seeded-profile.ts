'use server'

import { randomBytes, createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRADE_TYPES } from '@/lib/trade-types'
import { sendSeededOutreach } from '@/lib/seeded-outreach'
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

function normaliseBusinessName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

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

  // ── do_not_reseed check ──────────────────────────────────────
  const normName = normaliseBusinessName(businessName)
  const phoneHash = input.contact_phone ? sha256(input.contact_phone) : null
  const emailHash = input.contact_email ? sha256(input.contact_email) : null

  const orParts = [
    `business_name_normalised.eq.${normName}`,
    ...(phoneHash ? [`phone_hash.eq.${phoneHash}`] : []),
    ...(emailHash ? [`email_hash.eq.${emailHash}`] : []),
  ]

  const { data: dnsRows } = await admin
    .from('do_not_reseed')
    .select('id')
    .or(orParts.join(','))

  if (dnsRows && dnsRows.length > 0) {
    return {
      success: false,
      error: 'This business (or a contact detail matching it) is on the do-not-reseed list.',
      code: 'do_not_reseed',
    }
  }

  // ── Unique slug ───────────────────────────────────────────────
  const baseSlug = slugify(businessName)
  let slug = baseSlug
  let attempt = 0

  while (true) {
    const candidate = attempt === 0 ? slug : `${baseSlug}-${attempt}`

    // Check both trade_profiles and seeded_profiles for collisions
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

  const profile = inserted as unknown as SeededProfile

  // Day 0 outreach — fire and forget, non-fatal
  if (profile.contact_phone || profile.contact_email) {
    sendSeededOutreach(profile, 'day0').catch(err =>
      console.error('Day 0 outreach failed (non-fatal):', err)
    )
  }

  return { success: true, profile }
}
