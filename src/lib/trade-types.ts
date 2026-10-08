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

/** The work itself, as opposed to the person who does it (Tiler → tiling). */
const WORK_NAMES: Record<string, string> = {
  'Bathroom Fitter': 'bathroom fitting',
  Bricklayer: 'bricklaying',
  Builder: 'building',
  Carpenter: 'carpentry',
  'Cleaning and Clearance': 'cleaning and clearance',
  'Damp Proofing': 'damp proofing',
  Drainage: 'drainage',
  Driveways: 'driveway',
  Electrician: 'electrical',
  Fencing: 'fencing',
  'Fitted Furniture Maker': 'fitted furniture',
  'Flooring Fitter': 'flooring',
  'Gas Engineer': 'gas',
  'Guttering and Fascias': 'guttering and fascia',
  Handyman: 'handyman',
  'Heating Engineer': 'heating',
  Joiner: 'joinery',
  'Kitchen Fitter': 'kitchen fitting',
  Landscaper: 'landscaping',
  Locksmith: 'locksmith',
  'Painter and Decorator': 'painting and decorating',
  Paving: 'paving',
  Plasterer: 'plastering',
  Plumber: 'plumbing',
  Roofer: 'roofing',
  Tiler: 'tiling',
  'Tree Surgeon': 'tree surgery',
  'Window Fitter': 'window fitting',
  'Extension Builder': 'extension building',
  'Loft Conversion Specialist': 'loft conversion',
  'Basement and Cellar Conversion Specialist': 'basement conversion',
  'Conservatory Builder': 'conservatory',
  Jetwashing: 'jetwashing',
  'Rubbish and Waste Clearance': 'waste clearance',
  Tanking: 'tanking',
  Unblocking: 'unblocking',
  LVT: 'LVT flooring',
  'Carpet Fitting': 'carpet fitting',
  Laminate: 'laminate flooring',
  'Wood Flooring': 'wood flooring',
  'Gutter Clearing': 'gutter clearing',
  'Exterior Decorating': 'exterior decorating',
  'Venetian Plastering': 'Venetian plastering',
}

/** Title case name of the work: "Tiling", "Electrical". Falls back to the type as stored. */
export function workTitle(jobType: string | null | undefined): string {
  if (!jobType) return 'Job'
  const work = jobType === 'Other' ? 'Other work' : (WORK_NAMES[jobType] ?? jobType)
  return work.charAt(0).toUpperCase() + work.slice(1)
}

/** "tiling job", "electrical job". Falls back to a lower cased type, or just "job". */
export function jobLabel(jobType: string | null | undefined): string {
  if (!jobType || jobType === 'Other') return 'job'
  const work = WORK_NAMES[jobType] ?? jobType.toLowerCase()
  return `${work} job`
}

/** "a tiling job", "an electrical job". */
export function aJobLabel(jobType: string | null | undefined): string {
  const label = jobLabel(jobType)
  return `${/^(?:[aeiou]|LVT)/i.test(label) ? 'an' : 'a'} ${label}`
}
