export type UserType = 'tradesperson' | 'client' | 'both'
export type ClientType = 'individual' | 'business'
export type VerificationTier = 'unverified' | 'phone_verified' | 'fully_verified'
export type IdVerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'
export type SubscriptionTier = 'free' | 'pro' | 'team'
export type SubscriptionStatus = 'active' | 'inactive' | 'trialling'

export interface User {
  id: string
  email: string
  user_type: UserType | null
  client_type: ClientType | null
  full_name: string
  phone: string | null
  phone_verified: boolean
  verification_tier: VerificationTier
  licence_number_hash: string | null
  id_verification_status: IdVerificationStatus
  id_submitted_at: string | null
  id_reviewed_at: string | null
  id_reviewed_by: string | null
  previously_deactivated: boolean
  created_at: string
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  organisation_id: string | null
}

export interface TradeProfile {
  id: string
  user_id: string
  trade_type: string
  company_name: string | null
  postcode: string
  username: string
  bio: string | null
  average_rating: number
  total_reviews: number
  created_at: string
}

export interface ClientProfile {
  id: string
  user_id: string
  postcode: string
  average_rating: number
  total_reviews: number
  payment_speed_score: number
  scope_change_score: number
  communication_score: number
  red_flag_count: number
  created_at: string
}

export type DeactivatedIdentityType = 'phone' | 'email' | 'licence_number'

export interface DeactivatedIdentity {
  id: string
  identity_hash: string
  identity_type: DeactivatedIdentityType
  deactivated_at: string
  deactivated_by: string | null
  reason: string | null
}

// Satisfying Supabase's GenericTable.Row constraint requires Record<string, unknown>.
// TypeScript interfaces don't extend Record<string, unknown> in conditional type checks
// (no implicit index signature), so we intersect each Row with Record<string, unknown>
// while keeping specific property types accessible.
type WithIndex<T> = T & Record<string, unknown>

export interface Database {
  public: {
    Tables: {
      users: {
        Row: WithIndex<User>
        Insert: Omit<User, 'created_at' | 'phone_verified' | 'verification_tier' | 'id_verification_status' | 'previously_deactivated' | 'subscription_tier' | 'subscription_status'> & Partial<Pick<User, 'created_at' | 'phone_verified' | 'verification_tier' | 'id_verification_status' | 'previously_deactivated' | 'subscription_tier' | 'subscription_status'>>
        Update: Partial<User>
        Relationships: []
      }
      trade_profiles: {
        Row: WithIndex<TradeProfile>
        Insert: Omit<TradeProfile, 'id' | 'created_at' | 'average_rating' | 'total_reviews'> & Partial<Pick<TradeProfile, 'id' | 'created_at' | 'average_rating' | 'total_reviews'>>
        Update: Partial<TradeProfile>
        Relationships: []
      }
      client_profiles: {
        Row: WithIndex<ClientProfile>
        Insert: Omit<ClientProfile, 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'payment_speed_score' | 'scope_change_score' | 'communication_score' | 'red_flag_count'> & Partial<Pick<ClientProfile, 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'payment_speed_score' | 'scope_change_score' | 'communication_score' | 'red_flag_count'>>
        Update: Partial<ClientProfile>
        Relationships: []
      }
      deactivated_identities: {
        Row: WithIndex<DeactivatedIdentity>
        Insert: Omit<DeactivatedIdentity, 'id' | 'deactivated_at'> & Partial<Pick<DeactivatedIdentity, 'id' | 'deactivated_at'>>
        Update: Partial<DeactivatedIdentity>
        Relationships: []
      }
    }
    // GenericSchema requires Views and Functions (non-optional)
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
