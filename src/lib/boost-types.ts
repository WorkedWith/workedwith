// Shared (client + server) types for Boosted Districts (PRD 15).

export const BOOST_SLOTS_PER_TRADE_TYPE = 3
export const MAX_BOOSTS = 20 // matches the 20 operating district limit
export const ADDON_PRICE_TEXT = '£10 a month'

export type BoostSummary = {
  boosted: string[]
  /** Slots billed from the next invoice */
  billedSlots: number
  /** Slots already paid for this billing period (>= billedSlots) */
  paidSlots: number
  /** Renewal date, ISO, or null */
  renewsOn: string | null
}

export type BoostChangeResult =
  | { status: 'ok'; summary: BoostSummary; message?: string }
  | { status: 'needs_confirm'; extraSlots: number; priceText: string }
  | { status: 'full'; district: string; tradeTypes: string[] }
  | { status: 'error'; error: string }
