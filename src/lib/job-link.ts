import { APP_URL, APP_HOST } from '@/lib/app-url'
import { SPECIALISMS, TRADE_TYPES } from '@/lib/trade-types'

export const LINK_MAX_PER_CLIENT_PER_TRADE = 3      // in 30 days
export const LINK_MAX_PER_TRADE_PER_DAY = 30
export const LINK_MIN_FORM_MS = 3000                // quicker than this is not a person

export const jobLinkUrl = (slug: string) => `${APP_URL}/t/${slug}/job`
export const jobLinkDisplay = (slug: string) => `${APP_HOST}/t/${slug}/job`

export const shareMessage = (businessName: string, url: string) =>
  `Had a job done by ${businessName}? Log it on WorkedWith and we can both leave a review. ${url}`

/** Job types a client can pick on a trade's link: the trade's own trades and specialisms. */
export function jobTypeOptions(tradeTypes: string[]): string[] {
  const out = new Set<string>()
  for (const t of tradeTypes) {
    out.add(t)
    const specs = (SPECIALISMS as Record<string, readonly string[] | undefined>)[t]
    specs?.forEach(s => out.add(s))
  }
  // Keep only terms the platform knows
  const known = new Set<string>(TRADE_TYPES as readonly string[])
  return Array.from(out).filter(t => known.has(t) || out.has(t))
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-03" to "March 2026" */
export function monthLabel(ym: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!m) return null
  const idx = parseInt(m[2], 10) - 1
  if (idx < 0 || idx > 11) return null
  return `${MONTHS[idx]} ${m[1]}`
}
