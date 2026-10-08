// Main trades: shown in every dropdown (job logging, search, onboarding).
export const TRADE_TYPES = [
  'Bathroom Fitter',
  'Bricklayer',
  'Builder',
  'Carpenter',
  'Cleaning and Clearance',
  'Damp Proofing',
  'Drainage',
  'Driveways',
  'Electrician',
  'Fencing',
  'Fitted Furniture Maker',
  'Flooring Fitter',
  'Gas Engineer',
  'Guttering and Fascias',
  'Handyman',
  'Heating Engineer',
  'Joiner',
  'Kitchen Fitter',
  'Landscaper',
  'Locksmith',
  'Painter and Decorator',
  'Paving',
  'Plasterer',
  'Plumber',
  'Roofer',
  'Tiler',
  'Tree Surgeon',
  'Window Fitter',
  'Other',
] as const

export type TradeType = (typeof TRADE_TYPES)[number]

// Specialisms: optional extras a tradesperson can tick under a main trade.
// They are stored in the same trade_types list as the main trades.
export const SPECIALISMS: Partial<Record<TradeType, readonly string[]>> = {
  Builder: [
    'Extension Builder',
    'Loft Conversion Specialist',
    'Basement and Cellar Conversion Specialist',
    'Conservatory Builder',
  ],
  'Cleaning and Clearance': ['Jetwashing', 'Rubbish and Waste Clearance'],
  'Damp Proofing': ['Tanking'],
  Drainage: ['Unblocking'],
  'Flooring Fitter': ['LVT', 'Carpet Fitting', 'Laminate', 'Wood Flooring'],
  'Guttering and Fascias': ['Gutter Clearing'],
  'Painter and Decorator': ['Exterior Decorating'],
  Plasterer: ['Venetian Plastering'],
}

export const ALL_SPECIALISMS: readonly string[] = Object.values(SPECIALISMS).flat()

// Everything a tradesperson can hold on their profile.
export const ALL_TRADE_TERMS: readonly string[] = [...TRADE_TYPES, ...ALL_SPECIALISMS]

export function parentTrade(specialism: string): TradeType | null {
  for (const [trade, list] of Object.entries(SPECIALISMS)) {
    if (list?.includes(specialism)) return trade as TradeType
  }
  return null
}
