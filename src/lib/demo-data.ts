// Demo data — fictional profiles used on public landing/demo pages only.
// None of these appear in the real search index.

export type DemoTradeProfile = {
  id: string
  full_name: string
  trade_types: string[]
  postcode: string
  location: string
  years_experience: number
  public_slug: string
  average_rating: number
  total_reviews: number
  total_jobs: number
  verification_tier: 'fully_verified' | 'phone_verified'
  subscription_tier: 'pro' | 'standard'
  bio: string
  is_demo: true
}

export type DemoClientReview = {
  reviewer_label: string
  trade_type: string
  tradesperson_name: string
  overall_rating: number
  quality_score: number
  communication_score: number
  reliability_score: number
  value_score: number
  written_review: string
  date: string
  is_backdated: boolean
}

export type DemoTradespersonReview = {
  reviewer_label: string
  trade_type: string
  client_display: string
  overall_rating: number
  payment_score: number
  communication_score: number
  scope_clarity_score: number
  written_review: string
  date: string
}

export const DEMO_TRADE_PROFILES: DemoTradeProfile[] = [
  {
    id: 'demo-1',
    full_name: 'James Whitfield',
    trade_types: ['Electrician'],
    postcode: 'CH1',
    location: 'Chester',
    years_experience: 12,
    public_slug: 'demo-james-whitfield',
    average_rating: 4.8,
    total_reviews: 23,
    total_jobs: 31,
    verification_tier: 'fully_verified',
    subscription_tier: 'pro',
    bio: 'Domestic and commercial electrician based in Chester. Part P certified, NICEIC approved. Specialising in rewires, consumer unit upgrades, and EV charger installation.',
    is_demo: true,
  },
  {
    id: 'demo-2',
    full_name: 'Sarah Moran',
    trade_types: ['Plasterer', 'Decorator'],
    postcode: 'M1',
    location: 'Manchester',
    years_experience: 8,
    public_slug: 'demo-sarah-moran',
    average_rating: 4.9,
    total_reviews: 17,
    total_jobs: 22,
    verification_tier: 'fully_verified',
    subscription_tier: 'standard',
    bio: 'Plasterer and decorator with 8 years experience across Manchester and Salford. Skimming, rendering, feature walls, and full room decoration.',
    is_demo: true,
  },
  {
    id: 'demo-3',
    full_name: 'Owen Pritchard',
    trade_types: ['Plumber'],
    postcode: 'LL57',
    location: 'Bangor',
    years_experience: 15,
    public_slug: 'demo-owen-pritchard',
    average_rating: 4.7,
    total_reviews: 34,
    total_jobs: 41,
    verification_tier: 'fully_verified',
    subscription_tier: 'pro',
    bio: 'Fully qualified plumber based in Bangor, North Wales. Bathroom installations, boiler servicing, leak repairs, and full heating systems.',
    is_demo: true,
  },
]

export const DEMO_CLIENT_REVIEWS: DemoClientReview[] = [
  {
    reviewer_label: 'Verified client',
    trade_type: 'Electrician',
    tradesperson_name: 'James Whitfield',
    overall_rating: 5,
    quality_score: 5,
    communication_score: 5,
    reliability_score: 5,
    value_score: 4,
    written_review: 'James rewired our entire house and upgraded the consumer unit. Immaculate work, very tidy, explained everything clearly. Would absolutely recommend.',
    date: 'May 2026',
    is_backdated: false,
  },
  {
    reviewer_label: 'Verified client',
    trade_type: 'Plasterer',
    tradesperson_name: 'Sarah Moran',
    overall_rating: 5,
    quality_score: 5,
    communication_score: 5,
    reliability_score: 5,
    value_score: 5,
    written_review: 'Sarah skimmed three rooms and decorated two of them. Faultless finish, arrived when she said she would, and left the place spotless. Already booked her for the next room.',
    date: 'April 2026',
    is_backdated: false,
  },
  {
    reviewer_label: 'Verified client',
    trade_type: 'Plumber',
    tradesperson_name: 'Owen Pritchard',
    overall_rating: 5,
    quality_score: 5,
    communication_score: 4,
    reliability_score: 5,
    value_score: 5,
    written_review: 'Owen sorted a leak we had been chasing for months. Found it within the hour and had it fixed the same day. Very fair price.',
    date: 'March 2026',
    is_backdated: true,
  },
]

export const DEMO_TRADESPERSON_REVIEWS: DemoTradespersonReview[] = [
  {
    reviewer_label: 'Verified tradesperson',
    trade_type: 'Electrician',
    client_display: 'D. Harrison, Chester',
    overall_rating: 5,
    payment_score: 5,
    communication_score: 5,
    scope_clarity_score: 5,
    written_review: 'Brilliant client. Knew exactly what they wanted, had access ready on the day, and paid the same afternoon the job was done. Would work with again without hesitation.',
    date: 'May 2026',
  },
  {
    reviewer_label: 'Verified tradesperson',
    trade_type: 'Plasterer',
    client_display: 'R. Okafor, Salford',
    overall_rating: 5,
    payment_score: 5,
    communication_score: 5,
    scope_clarity_score: 4,
    written_review: 'Really straightforward client. Minor scope change on day two but handled it professionally and agreed the extra cost without any fuss.',
    date: 'April 2026',
  },
  {
    reviewer_label: 'Verified tradesperson',
    trade_type: 'Plumber',
    client_display: 'T. Williams, Bangor',
    overall_rating: 4,
    payment_score: 4,
    communication_score: 4,
    scope_clarity_score: 5,
    written_review: 'Good client, clear brief, property was easy to access. Payment came a few days after completion but within the agreed terms.',
    date: 'March 2026',
  },
]
