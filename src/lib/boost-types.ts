// Shared (client + server) types for the Boost switch model.

export const INCLUDED_BOOSTS = 3
export const ADDON_MAX = 17 // 3 included + 17 = 20, matching the 20 operating area limit
export const ADDON_PRICE_TEXT = '£10 per month'

export type BoostSummary = {
  boosted: string[]
  /** Add-on slots billed from the next invoice */
  billedSlots: number
  /** Add-on slots already paid for this billing period (>= billedSlots) */
  paidSlots: number
  /** Renewal date, ISO, or null */
  renewsOn: string | null
}

export type BoostChangeResult =
  | { status: 'ok'; summary: BoostSummary; message?: string }
  | { status: 'needs_confirm'; extraSlots: number; priceText: string }
  | { status: 'error'; error: string }
