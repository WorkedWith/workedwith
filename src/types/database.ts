// ── Scalar types ──────────────────────────────────────────────

export type UserType = 'trade' | 'client_individual' | 'client_business' | 'both'
export type ClientType = 'individual' | 'business'
export type VerificationTier = 'unverified' | 'phone_verified' | 'fully_verified'
export type IdVerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'
export type SubscriptionTier = 'free' | 'standard' | 'pro'
export type BillingPeriod = 'monthly' | 'annual'

// ── Row interfaces ────────────────────────────────────────────

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
  stripe_customer_id: string | null
  organisation_id: string | null
  is_admin: boolean
}

export interface TradeProfile {
  id: string
  user_id: string
  trade_types: string[]
  company_name: string | null
  postcode: string
  public_slug: string
  bio: string | null
  average_rating: number
  total_reviews: number
  years_experience: number | null
  radius_miles: number
  is_searchable: boolean
  subscription_tier: SubscriptionTier
  billing_period: BillingPeriod
  subscription_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  total_jobs: number
  created_at: string
}

export interface ClientProfile {
  id: string
  user_id: string
  postcode: string
  display_name: string | null
  client_type: ClientType | null
  company_name: string | null
  companies_house_number: string | null
  average_rating: number
  total_reviews: number
  payment_reliability_score: number
  scope_clarity_score: number
  communication_score: number
  red_flag_count: number
  is_searchable: boolean
  total_jobs: number
  created_at: string
}

export type OrganisationAccountType = 'client' | 'trade' | 'both'
export type OrganisationMemberRole = 'owner' | 'admin' | 'member'

export interface Organisation {
  id: string
  company_name: string
  companies_house_number: string
  companies_house_verified: boolean
  companies_house_verified_at: string | null
  company_status: string | null
  registered_postcode: string | null
  account_type: OrganisationAccountType
  primary_contact_user_id: string | null
  owner_id: string | null
  average_rating: number
  total_reviews: number
  payment_speed_score: number
  scope_change_score: number
  red_flag_count: number
  created_at: string
}

export interface OrganisationMember {
  id: string
  organisation_id: string | null
  user_id: string | null
  role: OrganisationMemberRole | null
  invited_by: string | null
  joined_at: string
}

export type OrganisationInviteRole = 'admin' | 'member'

export interface OrganisationInvite {
  id: string
  organisation_id: string
  email: string
  role: OrganisationInviteRole
  invited_by: string
  invite_token: string
  created_at: string
  accepted_at: string | null
  expires_at: string
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

// ── v2.1 additions ────────────────────────────────────────────

export type JobStatus =
  | 'pending_confirmation'
  | 'active'
  | 'completed'
  | 'disputed'
  | 'cancelled'

export type JobInitiatedBy = 'trade' | 'client'

export interface Job {
  id: string
  trade_profile_id: string | null
  client_profile_id: string | null
  initiated_by: JobInitiatedBy | null
  job_type: string
  description: string | null
  location: string | null
  postcode: string | null
  started_at: string | null
  completed_at: string | null
  status: JobStatus
  is_backdated: boolean
  backdated_period: string | null
  confirmed_at: string | null
  confirmation_token: string | null
  confirmation_expires_at: string | null
  agreed_payment_terms_days: number | null
  logged_from_ip: string | null
  logged_from_user_agent: string | null
  confirmed_from_ip: string | null
  confirmed_from_user_agent: string | null
  created_at: string
  updated_at: string
}

export type IntegrityFlagType =
  | 'same_ip_both_parties'
  | 'same_device_both_parties'
  | 'velocity_spike'
  | 'postcode_distance_anomaly'
  | 'new_accounts_both_parties'

export type IntegrityFlagOutcome = 'pending' | 'dismissed' | 'actioned'

export interface ReviewIntegrityFlag {
  id: string
  job_id: string | null
  flag_type: IntegrityFlagType
  details: string | null
  flagged_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  outcome: IntegrityFlagOutcome
}

export interface ReviewWindow {
  id: string
  job_id: string
  trade_review_submitted: boolean
  client_review_submitted: boolean
  window_opened_at: string
  window_closes_at: string | null
  blind_window_closes_at: string
  reminder_7_sent_at: string | null
  reminder_14_sent_at: string | null
  both_submitted_at: string | null
}

export type ReviewerType = 'trade' | 'client'
export type RedFlagReason =
  | 'aggressive_behaviour'
  | 'refused_access'
  | 'non_payment'
  | 'false_dispute'
  | 'unsafe_site'
  | 'other'

export interface Review {
  id: string
  job_id: string
  reviewer_id: string
  reviewee_id: string
  reviewer_type: ReviewerType | null
  reviewee_type: ReviewerType | null
  overall_rating: number | null
  payment_score: number | null
  scope_clarity_score: number | null
  site_access_score: number | null
  red_flag: boolean
  red_flag_reason: RedFlagReason | null
  quality_score: number | null
  reliability_score: number | null
  value_score: number | null
  communication_score: number | null
  would_work_again: boolean | null
  written_review: string | null
  agreed_payment_terms_days: number | null
  is_backdated: boolean
  submitted_at: string
  is_visible: boolean
  dispute_status: DisputeStatus
  response_text: string | null
  response_submitted_at: string | null
  created_at: string
}

// ── Disputes ──────────────────────────────────────────────────

export type DisputeReason =
  | 'job_did_not_happen'
  | 'factually_incorrect'
  | 'defamatory'
  | 'wrong_person'
  | 'other'

export type AdminDecision =
  | 'pending'
  | 'review_kept'
  | 'review_removed'
  | 'review_amended'

export type DisputeStatus =
  | 'none'
  | 'open'
  | 'resolved_kept'
  | 'resolved_removed'
  | 'resolved_amended'

export interface Dispute {
  id: string
  review_id: string
  raised_by: string
  reason: DisputeReason
  details: string
  raised_at: string
  evidence_deadline: string
  respondent_id: string
  respondent_evidence: string | null
  respondent_submitted_at: string | null
  admin_decision: AdminDecision
  admin_decision_at: string | null
  admin_decision_by: string | null
  admin_notes: string | null
  decision_deadline: string
  notified_at: string | null
}

export type JobInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface JobInvite {
  id: string
  job_id: string
  inviter_id: string
  invitee_email: string | null
  invitee_phone: string | null
  invite_token: string | null
  status: JobInviteStatus
  sent_at: string
  expires_at: string
  responded_at: string | null
}

export type NotificationType =
  | 'new_review'
  | 'review_response'
  | 'dispute_raised'
  | 'dispute_evidence_due'
  | 'dispute_resolved'
  | 'invite_accepted'
  | 'job_confirmed'
  | 'review_window_opened'
  | 'review_reminder'
  | 'reviews_published'
  | 'id_verified'
  | 'id_rejected'
  | 'subscription_updated'
  | 'red_flag_received'
  | 'job_invite'

export interface Notification {
  id: string
  user_id: string | null
  type: NotificationType | null
  title: string | null
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

// ── Search audit ─────────────────────────────────────────────

export type SearchAuditResult = 'match_found' | 'no_match' | 'rate_limited'

export interface SearchAuditLog {
  id: string
  searcher_id: string | null
  search_type: string | null
  identifier_hash: string | null
  result: SearchAuditResult | null
  searched_at: string
  ip_address: string | null
}

// ── Verification documents ────────────────────────────────────

export type VerificationOutcome = 'pending' | 'approved' | 'rejected'
export type ModerationStatus = 'pending' | 'approved' | 'rejected'

export interface VerificationDocument {
  id: string
  user_id: string
  storage_path: string
  outcome: VerificationOutcome
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
}

// ── Featured jobs ─────────────────────────────────────────────

export interface FeaturedJob {
  id: string
  trade_profile_id: string
  job_id: string | null
  title: string
  created_at: string
}

export interface FeaturedJobImage {
  id: string
  featured_job_id: string
  storage_path: string
  caption: string | null
  display_order: number
  moderation_status: ModerationStatus
  created_at: string
}

// ── Supabase Database type ────────────────────────────────────
// TypeScript interfaces don't satisfy Record<string, unknown> in conditional
// type checks (no implicit index signature). WithIndex<T> adds one while
// keeping all named properties accessible at their specific types.
type WithIndex<T> = T & Record<string, unknown>

export interface Database {
  public: {
    Tables: {
      users: {
        Row: WithIndex<User>
        Insert: Omit<User, 'created_at' | 'phone_verified' | 'verification_tier' | 'id_verification_status' | 'previously_deactivated' | 'is_admin'> & Partial<Pick<User, 'created_at' | 'phone_verified' | 'verification_tier' | 'id_verification_status' | 'previously_deactivated' | 'is_admin'>>
        Update: Partial<User>
        Relationships: []
      }
      trade_profiles: {
        Row: WithIndex<TradeProfile>
        Insert: Omit<TradeProfile, 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'trade_types' | 'is_searchable' | 'radius_miles' | 'total_jobs' | 'subscription_tier' | 'billing_period' | 'subscription_expires_at' | 'years_experience' | 'stripe_customer_id' | 'stripe_subscription_id'> & Partial<Pick<TradeProfile, 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'trade_types' | 'is_searchable' | 'radius_miles' | 'total_jobs' | 'subscription_tier' | 'billing_period' | 'subscription_expires_at' | 'years_experience' | 'stripe_customer_id' | 'stripe_subscription_id'>>
        Update: Partial<TradeProfile>
        Relationships: []
      }
      client_profiles: {
        Row: WithIndex<ClientProfile>
        Insert: Omit<ClientProfile, 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'payment_reliability_score' | 'scope_clarity_score' | 'communication_score' | 'red_flag_count' | 'is_searchable' | 'total_jobs' | 'display_name' | 'client_type' | 'company_name' | 'companies_house_number'> & Partial<Pick<ClientProfile, 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'payment_reliability_score' | 'scope_clarity_score' | 'communication_score' | 'red_flag_count' | 'is_searchable' | 'total_jobs' | 'display_name' | 'client_type' | 'company_name' | 'companies_house_number'>>
        Update: Partial<ClientProfile>
        Relationships: []
      }
      deactivated_identities: {
        Row: WithIndex<DeactivatedIdentity>
        Insert: Omit<DeactivatedIdentity, 'id' | 'deactivated_at'> & Partial<Pick<DeactivatedIdentity, 'id' | 'deactivated_at'>>
        Update: Partial<DeactivatedIdentity>
        Relationships: []
      }
      organisations: {
        Row: WithIndex<Organisation>
        Insert: Omit<Organisation, 'id' | 'created_at' | 'companies_house_verified' | 'average_rating' | 'total_reviews' | 'payment_speed_score' | 'scope_change_score' | 'red_flag_count' | 'account_type' | 'owner_id'> & Partial<Pick<Organisation, 'id' | 'created_at' | 'companies_house_verified' | 'average_rating' | 'total_reviews' | 'payment_speed_score' | 'scope_change_score' | 'red_flag_count' | 'account_type' | 'owner_id'>>
        Update: Partial<Organisation>
        Relationships: []
      }
      organisation_members: {
        Row: WithIndex<OrganisationMember>
        Insert: Omit<OrganisationMember, 'id' | 'joined_at'> & Partial<Pick<OrganisationMember, 'id' | 'joined_at'>>
        Update: Partial<OrganisationMember>
        Relationships: []
      }
      organisation_invites: {
        Row: WithIndex<OrganisationInvite>
        Insert: Omit<OrganisationInvite, 'id' | 'created_at' | 'invite_token' | 'accepted_at' | 'expires_at'> & Partial<Pick<OrganisationInvite, 'id' | 'created_at' | 'invite_token' | 'accepted_at' | 'expires_at'>>
        Update: Partial<OrganisationInvite>
        Relationships: []
      }
      jobs: {
        Row: WithIndex<Job>
        // job_type is the only NOT NULL column without a default; trade_profile_id is nullable for client-initiated backdated jobs
        Insert: { job_type: string } & Partial<Omit<Job, 'job_type' | 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Job>
        Relationships: []
      }
      review_integrity_flags: {
        Row: WithIndex<ReviewIntegrityFlag>
        Insert: Partial<ReviewIntegrityFlag>
        Update: Partial<ReviewIntegrityFlag>
        Relationships: []
      }
      review_windows: {
        Row: WithIndex<ReviewWindow>
        // job_id is NOT NULL without a default
        Insert: { job_id: string } & Partial<Omit<ReviewWindow, 'job_id' | 'id'>>
        Update: Partial<ReviewWindow>
        Relationships: []
      }
      reviews: {
        Row: WithIndex<Review>
        // job_id, reviewer_id, reviewee_id are NOT NULL without defaults
        Insert: { job_id: string; reviewer_id: string; reviewee_id: string } & Partial<Omit<Review, 'job_id' | 'reviewer_id' | 'reviewee_id'>>
        Update: Partial<Review>
        Relationships: []
      }
      job_invites: {
        Row: WithIndex<JobInvite>
        // job_id and inviter_id are NOT NULL without defaults
        Insert: { job_id: string; inviter_id: string } & Partial<Omit<JobInvite, 'job_id' | 'inviter_id'>>
        Update: Partial<JobInvite>
        Relationships: []
      }
      notifications: {
        Row: WithIndex<Notification>
        // All columns are nullable or have DB defaults
        Insert: Partial<Notification>
        Update: Partial<Notification>
        Relationships: []
      }
      search_audit_log: {
        Row: WithIndex<SearchAuditLog>
        // All columns nullable or have DB defaults
        Insert: Partial<SearchAuditLog>
        Update: Partial<SearchAuditLog>
        Relationships: []
      }
      disputes: {
        Row: WithIndex<Dispute>
        // review_id, raised_by, reason, details, respondent_id are NOT NULL without defaults
        Insert: { review_id: string; raised_by: string; reason: DisputeReason; details: string; respondent_id: string } & Partial<Omit<Dispute, 'review_id' | 'raised_by' | 'reason' | 'details' | 'respondent_id'>>
        Update: Partial<Dispute>
        Relationships: []
      }
      verification_documents: {
        Row: WithIndex<VerificationDocument>
        Insert: { user_id: string; storage_path: string } & Partial<Omit<VerificationDocument, 'user_id' | 'storage_path'>>
        Update: Partial<VerificationDocument>
        Relationships: []
      }
      featured_jobs: {
        Row: WithIndex<FeaturedJob>
        Insert: { trade_profile_id: string; title: string } & Partial<Omit<FeaturedJob, 'trade_profile_id' | 'title' | 'id' | 'created_at'>>
        Update: Partial<FeaturedJob>
        Relationships: []
      }
      featured_job_images: {
        Row: WithIndex<FeaturedJobImage>
        Insert: { featured_job_id: string; storage_path: string } & Partial<Omit<FeaturedJobImage, 'featured_job_id' | 'storage_path' | 'id' | 'created_at'>>
        Update: Partial<FeaturedJobImage>
        Relationships: []
      }
    }
    // GenericSchema requires Views and Functions (non-optional)
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
