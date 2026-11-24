import type { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/app-url'
import { sendEmail } from '@/lib/email/send'
import { seededEmailV42, type SeededStep } from '@/lib/email/templates-v42'
import { isLimitedCompany } from './companies-house'
import { normaliseBusinessName, normaliseEmail, normalisePhone, sha256 } from '@/lib/seeded-hash'
import type { SeededProfile } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

/** PRD 16: a listing lives 90 days, with reminder points at day 30, 60 and 80, then removal. */
export const SEEDED_LIFETIME_DAYS_V42 = 90
const STEPS: { step: Exclude<SeededStep, 'day0'>; day: number; column: 'reminder_1_sent_at' | 'reminder_2_sent_at' | 'reminder_3_sent_at' }[] = [
  { step: 'day80', day: 80, column: 'reminder_3_sent_at' },
  { step: 'day60', day: 60, column: 'reminder_2_sent_at' },
  { step: 'day30', day: 30, column: 'reminder_1_sent_at' },
]

/** Outreach only to active limited companies with an email (PECR). Sole traders and partnerships never. */
export function outreachAllowed(p: SeededProfile): boolean {
  return p.source === 'admin' && !!p.contact_email && !!p.companies_house_number && p.companies_house_status === 'active' && isLimitedCompany(p.company_type)
}

async function activity(admin: AdminClient, id: string): Promise<{ views: number; emails: number }> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [{ count: v }, { count: e }] = await Promise.all([
    admin.from('seeded_profile_views').select('id', { count: 'exact', head: true }).eq('seeded_profile_id', id).gte('created_at', since),
    admin.from('profile_contact_clicks').select('id', { count: 'exact', head: true }).eq('seeded_profile_id', id).gte('created_at', since),
  ])
  return { views: v ?? 0, emails: e ?? 0 }
}

export async function sendSeededStep(admin: AdminClient, p: SeededProfile, step: SeededStep): Promise<boolean> {
  if (process.env.SEEDED_OUTREACH_ENABLED !== 'true' || !outreachAllowed(p) || !p.contact_email) return false
  const a = await activity(admin, p.id)
  const removeUrl = `${APP_URL}/claim/${p.claim_token}/remove`
  const r = await sendEmail(p.contact_email, seededEmailV42({
    step, name: p.business_name, claimUrl: `${APP_URL}/claim/${p.claim_token}`, removeUrl,
    removesOn: new Date(p.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }), views: a.views, emails: a.emails,
  }), { headers: { 'List-Unsubscribe': `<${removeUrl}>` } })
  return r.ok
}

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)

/** Daily: removal at 90 days (added to the do not reseed list), and the outreach points. */
export async function runSeededMaintenance(admin: AdminClient): Promise<Record<string, number>> {
  const out = { removed: 0, day0: 0, day30: 0, day60: 0, day80: 0 }
  const { data } = await admin.from('seeded_profiles').select('*').eq('status', 'unclaimed')
  for (const p of (data ?? []) as unknown as SeededProfile[]) {
    const age = daysSince(p.created_at)
    if (age >= SEEDED_LIFETIME_DAYS_V42 || new Date(p.expires_at) <= new Date()) {
      await admin.from('do_not_reseed').insert({
        business_name_normalised: normaliseBusinessName(p.business_name),
        phone_hash: p.contact_phone ? sha256(normalisePhone(p.contact_phone)) : null,
        email_hash: p.contact_email ? sha256(normaliseEmail(p.contact_email)) : null,
      })
      await admin.from('seeded_profiles').delete().eq('id', p.id)
      out.removed++
      continue
    }
    if (!outreachAllowed(p)) continue
    if (!p.initial_invite_sent_at) {
      if (await sendSeededStep(admin, p, 'day0')) {
        await admin.from('seeded_profiles').update({ initial_invite_sent_at: new Date().toISOString() }).eq('id', p.id)
        out.day0++
      }
      continue
    }
    for (const s of STEPS) {
      if (age >= s.day && !p[s.column]) {
        if (await sendSeededStep(admin, p, s.step)) {
          await admin.from('seeded_profiles').update(s.column === 'reminder_3_sent_at' ? { reminder_3_sent_at: new Date().toISOString() } : s.column === 'reminder_2_sent_at' ? { reminder_2_sent_at: new Date().toISOString() } : { reminder_1_sent_at: new Date().toISOString() }).eq('id', p.id)
          out[s.step]++
        }
        break
      }
    }
  }
  return out
}
