'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_TRADE_TERMS, parentTrade } from '@/lib/trade-types'
import { normaliseBusinessName, normaliseEmail, sha256 } from '@/lib/seeded-hash'
import { REJECTIONS_BEFORE_FLAG } from '@/lib/client-listings'
import type { ClientListingSubmission } from '@/types/database'

type Result = { success: true } | { success: false; error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  return caller?.is_admin ? { userId: user.id, admin } : null
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 50)
}

async function getSubmission(admin: ReturnType<typeof createAdminClient>, id: string): Promise<ClientListingSubmission | null> {
  const { data } = await admin.from('client_listing_submissions').select('*').eq('id', id).maybeSingle()
  return (data as unknown as ClientListingSubmission | null) ?? null
}

export type ApproveInput = {
  submissionId: string
  business_name: string
  trade_categories: string[]
  operating_areas: string[]
  public_email: string
}

/** Goes live as a normal "Not yet on WorkedWith" listing. Never carries a phone number or anything about the client or job. */
export async function approveClientListing(input: ApproveInput): Promise<Result> {
  const ctx = await requireAdmin()
  if (!ctx) return { success: false, error: 'Forbidden' }
  const { admin, userId } = ctx
  const sub = await getSubmission(admin, input.submissionId)
  if (!sub || sub.status !== 'pending') return { success: false, error: 'This submission has already been dealt with.' }

  const name = input.business_name.trim()
  if (!name || name.length > 100) return { success: false, error: 'Enter the business name.' }
  const picked = Array.from(new Set(input.trade_categories))
  if (picked.length === 0 || picked.length > 8 || !picked.every(t => ALL_TRADE_TERMS.includes(t))) {
    return { success: false, error: 'Choose between 1 and 8 valid trades.' }
  }
  const categories = [...picked]
  for (const t of picked) {
    const parent = parentTrade(t)
    if (parent && !categories.includes(parent)) categories.push(parent)
  }
  const areas = input.operating_areas.map(a => a.trim().toUpperCase()).filter(Boolean)
  if (areas.length === 0 || !areas.every(a => /^[A-Z]{1,2}\d[A-Z0-9]?$/.test(a))) return { success: false, error: 'Enter at least one valid postcode district.' }
  const email = input.public_email.trim() ? normaliseEmail(input.public_email) : null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'That email address does not look right.' }

  // Do not reseed list (fails closed)
  const norm = normaliseBusinessName(name)
  const { data: blocked, error: dnsErr } = await admin.from('do_not_reseed').select('id').eq('business_name_normalised', norm).maybeSingle()
  if (dnsErr) return { success: false, error: 'Could not check the do not reseed list. Try again.' }
  if (blocked) return { success: false, error: 'This business is on the do not reseed list.' }
  if (email) {
    const { data: e } = await admin.from('do_not_reseed').select('id').eq('email_hash', sha256(email)).maybeSingle()
    if (e) return { success: false, error: 'This email address is on the do not reseed list.' }
  }

  // Unique slug
  const base = slugify(name) || 'trade'
  let slug = ''
  for (let i = 0; i < 100; i++) {
    const cand = i === 0 ? base : `${base}-${i}`
    const [{ data: tp }, { data: sp }] = await Promise.all([
      admin.from('trade_profiles').select('id').eq('public_slug', cand).maybeSingle(),
      admin.from('seeded_profiles').select('id').eq('slug', cand).maybeSingle(),
    ])
    if (!tp && !sp) { slug = cand; break }
  }
  if (!slug) return { success: false, error: 'Could not create a unique address for this listing.' }

  // One timeline: the listing closes when the client's request does
  const { data: invites } = await admin.from('pending_invites').select('id, expires_at').eq('listing_submission_id', sub.id)
  const inviteList = (invites ?? []) as unknown as { id: string; expires_at: string }[]
  const latest = inviteList.map(i => new Date(i.expires_at).getTime()).sort((a, b) => b - a)[0]
  const expiresAt = new Date(latest && latest > Date.now() + 86_400_000 ? latest : Date.now() + 60 * 86_400_000).toISOString()

  const { data: inserted, error } = await admin.from('seeded_profiles').insert({
    slug,
    business_name: name,
    trade_category: categories[0],
    trade_categories: categories,
    operating_areas: areas,
    contact_phone: null,
    contact_email: email,
    source_note: 'Added by a client',
    claim_token: randomBytes(32).toString('hex'),
    expires_at: expiresAt,
    source: 'client_added',
    added_by_client_id: sub.client_id,
    public_reference_url: sub.public_reference_url,
  }).select('id').single()
  if (error || !inserted) return { success: false, error: 'Could not create the listing.' }

  const now = new Date().toISOString()
  await admin.from('client_listing_submissions').update({ status: 'approved', seeded_profile_id: inserted.id as string, reviewed_by: userId, reviewed_at: now }).eq('id', sub.id)
  await admin.from('pending_invites').update({ listing_id: inserted.id as string }).eq('listing_submission_id', sub.id)

  revalidatePath('/admin/client-listings')
  return { success: true }
}

export async function rejectClientListing(submissionId: string, note: string): Promise<Result> {
  const ctx = await requireAdmin()
  if (!ctx) return { success: false, error: 'Forbidden' }
  const { admin, userId } = ctx
  const sub = await getSubmission(admin, submissionId)
  if (!sub || sub.status !== 'pending') return { success: false, error: 'This submission has already been dealt with.' }

  await admin.from('client_listing_submissions').update({
    status: 'rejected', review_note: note.trim().slice(0, 300) || null, reviewed_by: userId, reviewed_at: new Date().toISOString(),
  }).eq('id', submissionId)

  // The invite itself carries on; only the directory listing is refused.
  const { count } = await admin.from('client_listing_submissions').select('id', { count: 'exact', head: true }).eq('client_id', sub.client_id).eq('status', 'rejected')
  if ((count ?? 0) >= REJECTIONS_BEFORE_FLAG) {
    const marker = `client ${sub.client_id}`
    const { data: open } = await admin.from('review_integrity_flags').select('details').eq('flag_type', 'repeated_rejected_listings').eq('outcome', 'pending')
    const already = ((open ?? []) as unknown as { details: string | null }[]).some(f => (f.details ?? '').includes(marker))
    if (!already) {
      await admin.from('review_integrity_flags').insert({
        flag_type: 'repeated_rejected_listings',
        details: `Directory listings added by ${marker} have been rejected ${count} times.`,
      })
    }
  }
  revalidatePath('/admin/client-listings')
  return { success: true }
}

/** The business is already listed: point the client's request at the existing listing instead. */
export async function mergeClientListing(submissionId: string, existingSlug: string): Promise<Result> {
  const ctx = await requireAdmin()
  if (!ctx) return { success: false, error: 'Forbidden' }
  const { admin, userId } = ctx
  const sub = await getSubmission(admin, submissionId)
  if (!sub || sub.status !== 'pending') return { success: false, error: 'This submission has already been dealt with.' }

  const slug = existingSlug.trim().toLowerCase().replace(/^.*\/t\//, '').replace(/\/.*$/, '')
  const { data: sp } = await admin.from('seeded_profiles').select('id').eq('slug', slug).neq('status', 'removed').maybeSingle()
  const { data: tp } = sp ? { data: null } : await admin.from('trade_profiles').select('id').eq('public_slug', slug).maybeSingle()
  if (!sp && !tp) return { success: false, error: 'No listing or profile with that address.' }

  await admin.from('client_listing_submissions').update({
    status: 'merged', seeded_profile_id: (sp?.id as string | undefined) ?? null, review_note: `Merged into ${slug}`, reviewed_by: userId, reviewed_at: new Date().toISOString(),
  }).eq('id', submissionId)
  if (sp) await admin.from('pending_invites').update({ listing_id: sp.id as string }).eq('listing_submission_id', submissionId)

  revalidatePath('/admin/client-listings')
  return { success: true }
}
