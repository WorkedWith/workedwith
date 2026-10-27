import { TradeIcon } from '@/components/trade-icon'

type Tone = 'amber' | 'soft' | 'dark'

const TONES: Record<Tone, string> = {
  amber: 'bg-amber-100 text-amber-800',
  soft: 'bg-gray-100 text-gray-700',
  dark: 'bg-brand-amber/20 text-brand-amber',
}

type Props = {
  trade: string
  tone?: Tone
  /** "sm" for dense lists, "md" for cards. */
  size?: 'sm' | 'md'
}

export function TradeChip({ trade, tone = 'amber', size = 'md' }: Props) {
  const sizing = size === 'sm' ? 'gap-1 px-2 py-0.5 text-xs' : 'gap-1.5 px-3 py-1 text-sm font-medium'
  return (
    <span className={`inline-flex items-center rounded-full ${sizing} ${TONES[tone]}`}>
      <TradeIcon trade={trade} className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {trade}
    </span>
  )
}
