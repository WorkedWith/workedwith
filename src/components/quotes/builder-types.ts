import type { QuoteDraftInput } from '@/lib/quotes/calc'

export type SectionProps = {
  q: QuoteDraftInput
  set: (patch: Partial<QuoteDraftInput>) => void
}

export type SavedItemOption = { id: string; description: string; pricePence: number }
export type PastQuoteOption = { id: string; title: string; clientName: string; totalPence: number }
