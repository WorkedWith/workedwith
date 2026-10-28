import { createAdminClient } from '@/lib/supabase/admin'
import { normaliseBusinessName, normaliseEmail, normalisePhone } from '@/lib/seeded-hash'

type AdminClient = ReturnType<typeof createAdminClient>

export const LISTINGS_PER_CLIENT_PER_30_DAYS = 3
export const REJECTIONS_BEFORE_FLAG = 2

/** Is this trade already on WorkedWith, claimed or listed, or already waiting for approval? */
export async function tradeAlreadyKnown(
  admin: AdminClient,
  p: { name: string; email?: string | null; phone?: string | null },
): Promise<boolean> {
  const name = normaliseBusinessName(p.name)
  const email = p.email ? normaliseEmail(p.email) : null
  const phone = p.phone ? normalisePhone(p.phone) : null

  const checks: PromiseLike<{ data: unknown[] | null }>[] = []

  if (email) {
    checks.push(admin.from('users').select('id').eq('email', email).in('user_type', ['trade', 'both']).limit(1))
    checks.push(admin.from('seeded_profiles').select('id').eq('contact_email', email).neq('status', 'removed').limit(1))
  }
  if (phone) {
    checks.push(admin.from('users').select('id').eq('phone', phone).in('user_type', ['trade', 'both']).limit(1))
    checks.push(admin.from('seeded_profiles').select('id').eq('contact_phone', phone).neq('status', 'removed').limit(1))
  }
  // Same business name (ignoring case) anywhere
  const likeName = name.replace(/[%_\\]/g, m => `\\${m}`)
  checks.push(admin.from('trade_profiles').select('id').ilike('company_name', likeName).limit(1))
  checks.push(admin.from('seeded_profiles').select('id').ilike('business_name', likeName).neq('status', 'removed').limit(1))
  checks.push(admin.from('client_listing_submissions').select('id').eq('business_name_normalised', name).in('status', ['pending', 'approved']).limit(1))

  const results = await Promise.all(checks)
  return results.some(r => (r.data ?? []).length > 0)
}

export function cleanReferenceUrl(raw: string | undefined | null): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    if (!u.hostname.includes('.')) return null
    return u.toString().slice(0, 300)
  } catch {
    return null
  }
}
