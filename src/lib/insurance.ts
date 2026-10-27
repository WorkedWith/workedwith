import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export const COVER_OPTIONS = [
  { value: 1_000_000, label: '£1 million' },
  { value: 2_000_000, label: '£2 million' },
  { value: 5_000_000, label: '£5 million' },
  { value: 10_000_000, label: '£10 million' },
] as const
export const MIN_COVER_GBP = 100_000
export const MAX_INSURANCE_FILE_BYTES = 4 * 1024 * 1024
export const INSURANCE_TOOLTIP =
  "WorkedWith checked this certificate when it was uploaded. For large jobs, it's worth asking to see it yourself."

export function coverLabel(gbp: number): string {
  if (gbp >= 1_000_000 && gbp % 1_000_000 === 0) return `£${gbp / 1_000_000}m`
  if (gbp >= 1_000_000) return `£${(gbp / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  return `£${gbp.toLocaleString('en-GB')}`
}

export function monthYear(dateOnly: string): string {
  return new Date(`${dateOnly}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function longDate(dateOnly: string): string {
  return new Date(`${dateOnly}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export type ActiveInsurance = { cover_amount_gbp: number; expires_on: string }

/** The tag shows only while an approved certificate is in date. Checked at read time, so it vanishes on the expiry date. */
export async function getActiveInsurance(admin: AdminClient, tradeIds: string[]): Promise<Map<string, ActiveInsurance>> {
  const out = new Map<string, ActiveInsurance>()
  if (tradeIds.length === 0) return out
  const { data } = await admin
    .from('trade_insurance')
    .select('trade_id, cover_amount_gbp, expires_on')
    .in('trade_id', tradeIds)
    .eq('status', 'approved')
    .gte('expires_on', todayIso())
  for (const r of (data ?? []) as unknown as { trade_id: string; cover_amount_gbp: number; expires_on: string }[]) {
    const prev = out.get(r.trade_id)
    if (!prev || r.expires_on > prev.expires_on) out.set(r.trade_id, { cover_amount_gbp: Number(r.cover_amount_gbp), expires_on: r.expires_on })
  }
  return out
}
