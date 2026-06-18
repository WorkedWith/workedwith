export const TRADE_TYPES = [
  'Bricklayer',
  'Builder',
  'Carpenter',
  'Decorator',
  'Electrician',
  'Gas Engineer',
  'General Builder',
  'Joiner',
  'Landscaper',
  'Painter and Decorator',
  'Plasterer',
  'Plumber',
  'Roofer',
  'Tiler',
  'Other',
] as const

export type TradeType = (typeof TRADE_TYPES)[number]
