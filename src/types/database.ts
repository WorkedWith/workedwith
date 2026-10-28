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
  id_reminder_sent_at?: string | null
  id_submitted_at: string | null
  id_reviewed_at: string | null
  id_reviewed_by: string | null
  previously_deactivated: boolean
  created_at: string
  stripe_customer_id: string | null
  organisation_id: string | null
  is_admin: boolean
  profile_photo_url: string | null
}

export interface TradeProfile {
  id: string
  user_id: string
  trade_types: string[]
  company_name: string | null
  postcode: string | null
  public_slug: string
  bio: string | null
  average_rating: number
  total_reviews: number
  years_experience: number | null
  operating_areas: string[]
  boosted_districts: string[]
  boosted_district_addon_quantity: number
  boosted_district_addon_paid_quantity: number
  boosted_districts_updated_at: string | null
  subscription_period_start_at: string | null
  is_searchable: boolean
  subscription_tier: SubscriptionTier
  billing_period: BillingPeriod
  subscription_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  total_jobs: number
  confirmation_counted: number
  confirmation_confirmed: number
  hired_again_count: number
  ended_early_count: number
  job_link_paused: boolean
  created_at: string
}

export interface ClientProfile {
  id: string
  user_id: string
  postcode: string
  display_name: string | null
  username: string | null
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
  confirmation_counted: number
  confirmation_confirmed: number
  ended_early_count: number
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
  | 'ended_early'

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
  confirmed_by_user_id: string | null
  confirmation_token: string | null
  confirmation_expires_at: string | null
  agreed_payment_terms_days: number | null
  logged_from_ip: string | null
  logged_from_user_agent: string | null
  confirmed_from_ip: string | null
  confirmed_from_user_agent: string | null
  ended_early_at: string | null
  outcome_disputed: boolean
  outcome_disputed_at: string | null
  last_stale_prompt_at: string | null
  created_at: string
  updated_at: string
}

export type IntegrityFlagType =
  | 'same_ip_both_parties'
  | 'same_device_both_parties'
  | 'velocity_spike'
  | 'postcode_distance_anomaly'
  | 'new_accounts_both_parties'
  | 'combined_signals'
  | 'false_decline'
  | 'repeated_unfounded_claims'
  | 'repeated_rejected_listings'

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

export interface IntegritySignal {
  id: string
  user_id: string
  kind: 'signup' | 'review'
  job_id: string | null
  ip_hash: string | null
  device_hash: string | null
  created_at: string
}

// ── Confirmation rate and evidence (PRD v3.7) ────────────────
export type RequestKind = 'pending_invite' | 'job_invite'
export type RequestOutcomeKind = 'confirmed' | 'wont_confirm' | 'not_me' | 'expired_unanswered' | 'overturned'

export interface RequestOutcome {
  id: string
  request_kind: RequestKind
  request_id: string
  recipient_id: string
  requester_id: string | null
  outcome: RequestOutcomeKind
  requested_at: string
  resolved_at: string
}

export type EvidenceClaimStatus = 'draft' | 'awaiting_response' | 'under_review' | 'upheld' | 'not_upheld' | 'withdrawn'
export type EvidenceType = 'invoice' | 'bank_transfer' | 'quote' | 'messages' | 'other'

export interface JobEvidenceClaim {
  id: string
  invite_kind: RequestKind
  invite_id: string
  requester_id: string
  respondent_id: string
  status: EvidenceClaimStatus
  requester_statement: string
  respondent_statement: string | null
  evidence_types: EvidenceType[]
  response_deadline: string | null
  decision_deadline: string | null
  decided_at: string | null
  decided_by: string | null
  decided_how: 'admin' | 'respondent_confirmed' | null
  files_deleted_at: string | null
  created_at: string
}

export interface JobEvidenceFile {
  id: string
  claim_id: string
  uploaded_by: string | null
  storage_path: string
  file_type: 'image' | 'pdf'
  evidence_type: EvidenceType
  created_at: string
}

export type InsuranceStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'replaced'

export interface TradeInsurance {
  id: string
  trade_id: string
  insurer: string
  cover_amount_gbp: number
  expires_on: string
  storage_path: string | null
  status: InsuranceStatus
  reject_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  reminded_30_at: string | null
  reminded_7_at: string | null
  files_deleted_at: string | null
  created_at: string
}

export interface ReviewWindow {
  id: string
  job_id: string
  trade_review_submitted: boolean
  client_review_submitted: boolean
  window_opened_at: string
  window_closes_at: string | null
  blind_window_closes_at: string
  reminder_4_sent_at: string | null
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
  submitted_by_user_id: string | null
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
  is_priority: boolean
}

export type DeclineReason = 'not_me' | 'wont_confirm'

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
  last_reminded_at?: string | null
  reminder_count?: number
  decline_reason?: DeclineReason | null
  decline_note?: string | null
  declined_at?: string | null
  declined_by_user_id?: string | null
  overturned_at?: string | null
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

// ── Pending invites (client-initiated trade claim flow) ───────

export type PendingInviteStatus = 'sent' | 'expired' | 'claimed' | 'disputed' | 'declined'

export interface PendingInvite {
  id: string
  inviting_client_id: string
  trade_name: string
  job_type: string
  description: string | null
  job_date: string
  contact_phone: string | null
  contact_email: string | null
  status: PendingInviteStatus
  claim_token: string
  claimed_by_user_id: string | null
  claimed_at: string | null
  resulting_job_id: string | null
  decline_reason: DeclineReason | null
  decline_note: string | null
  declined_at: string | null
  declined_by_user_id: string | null
  overturned_at: string | null
  source: 'client_invite' | 'trade_link'
  job_state: 'finished' | 'in_progress'
  job_month: string | null
  postcode_district: string | null
  target_user_id: string | null
  listing_submission_id: string | null
  listing_id: string | null
  reminder_count: number
  last_reminded_at: string | null
  created_at: string
  expires_at: string
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
  document_type?: 'driving_licence' | 'passport'
  selfie_path?: string | null
  selfie_code?: string | null
  selfie_submitted_at?: string | null
  outcome: VerificationOutcome
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
}

// ── Profile analytics ─────────────────────────────────────────

export type ProfileViewSource = 'direct' | 'search' | 'share'

export interface ProfileView {
  id: string
  trade_profile_id: string
  viewed_at: string
  viewer_id: string | null
  source: ProfileViewSource | null
}

export interface SearchAppearance {
  id: string
  trade_profile_id: string
  appeared_at: string
  search_postcode: string | null
  search_trade_type: string | null
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

export interface ProfileGalleryImage {
  id: string
  trade_profile_id: string
  storage_path: string
  caption: string | null
  display_order: number
  moderation_status: ModerationStatus
  created_at: string
}

export interface PhotoReport {
  id: string
  gallery_image_id: string | null
  featured_image_id: string | null
  reporter_id: string | null
  reason: string | null
  status: 'open' | 'dismissed' | 'removed'
  created_at: string
}

// ── Admin plan grants (PRD v3.8 item 6) ──────────────────────
export type TierGrantTier = 'standard' | 'pro'
export type TierGrantReason = 'founding' | 'goodwill' | 'partnership' | 'other'
export type TierGrantEndReason = 'expired' | 'ended_early' | 'superseded'
export type TierGrantAction = 'created' | 'extended' | 'tier_changed' | 'ended_early' | 'expired' | 'superseded'

export interface TierGrant {
  id: string
  user_id: string
  tier: TierGrantTier
  starts_at: string
  ends_at: string
  reason: TierGrantReason
  note: string | null
  granted_by: string | null
  ended_at: string | null
  ended_reason: TierGrantEndReason | null
  ended_by: string | null
  started_email_sent_at: string | null
  reminder_14_sent_at: string | null
  reminder_3_sent_at: string | null
  ended_email_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface TierGrantEvent {
  id: string
  grant_id: string
  action: TierGrantAction
  actor: string | null
  before_values: Record<string, unknown> | null
  after_values: Record<string, unknown> | null
  created_at: string
}

// ── Rate limit events ─────────────────────────────────────────

export interface BoostEventRow {
  id: string
  user_id: string | null
  event_type: 'on' | 'off' | 'swap' | 'area_removed'
  district: string | null
  from_district: string | null
  to_district: string | null
  created_at: string
}

export interface RateLimitEvent {
  id: string
  key: string
  created_at: string
}

// ── Seeded profiles ───────────────────────────────────────────

export type SeededProfileStatus = 'unclaimed' | 'claimed' | 'removed'

export interface SeededProfile {
  id: string
  slug: string
  business_name: string
  trade_category: string
  trade_categories: string[]
  operating_areas: string[]
  contact_phone: string | null
  contact_email: string | null
  source_note: string | null
  bio: string | null
  status: SeededProfileStatus
  claim_token: string
  created_at: string
  expires_at: string
  claimed_by_user_id: string | null
  initial_invite_sent_at: string | null
  reminder_1_sent_at: string | null
  reminder_2_sent_at: string | null
  reminder_3_sent_at: string | null
  source: 'admin' | 'client_added'
  added_by_client_id: string | null
  public_reference_url: string | null
}

export type ListingSubmissionStatus = 'pending' | 'approved' | 'rejected' | 'merged'

export interface ClientListingSubmission {
  id: string
  client_id: string
  business_name: string
  business_name_normalised: string
  trade_category: string
  district: string
  public_reference_url: string | null
  status: ListingSubmissionStatus
  seeded_profile_id: string | null
  review_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface DoNotReseed {
  id: string
  business_name_normalised: string
  phone_hash: string | null
  email_hash: string | null
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
        Insert: Omit<TradeProfile, 'postcode' | 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'trade_types' | 'is_searchable' | 'operating_areas' | 'boosted_districts' | 'boosted_district_addon_quantity' | 'boosted_district_addon_paid_quantity' | 'boosted_districts_updated_at' | 'subscription_period_start_at' | 'total_jobs' | 'confirmation_counted' | 'confirmation_confirmed' | 'hired_again_count' | 'ended_early_count' | 'job_link_paused' | 'subscription_tier' | 'billing_period' | 'subscription_expires_at' | 'years_experience' | 'stripe_customer_id' | 'stripe_subscription_id'> & Partial<Pick<TradeProfile, 'postcode' | 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'trade_types' | 'is_searchable' | 'operating_areas' | 'boosted_districts' | 'boosted_district_addon_quantity' | 'boosted_district_addon_paid_quantity' | 'boosted_districts_updated_at' | 'subscription_period_start_at' | 'total_jobs' | 'confirmation_counted' | 'confirmation_confirmed' | 'hired_again_count' | 'ended_early_count' | 'job_link_paused' | 'subscription_tier' | 'billing_period' | 'subscription_expires_at' | 'years_experience' | 'stripe_customer_id' | 'stripe_subscription_id'>>
        Update: Partial<TradeProfile>
        Relationships: []
      }
      client_profiles: {
        Row: WithIndex<ClientProfile>
        Insert: Omit<ClientProfile, 'username' | 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'payment_reliability_score' | 'scope_clarity_score' | 'communication_score' | 'red_flag_count' | 'is_searchable' | 'total_jobs' | 'confirmation_counted' | 'confirmation_confirmed' | 'ended_early_count' | 'display_name' | 'client_type' | 'company_name' | 'companies_house_number'> & Partial<Pick<ClientProfile, 'username' | 'id' | 'created_at' | 'average_rating' | 'total_reviews' | 'payment_reliability_score' | 'scope_clarity_score' | 'communication_score' | 'red_flag_count' | 'is_searchable' | 'total_jobs' | 'confirmation_counted' | 'confirmation_confirmed' | 'ended_early_count' | 'display_name' | 'client_type' | 'company_name' | 'companies_house_number'>>
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
      profile_views: {
        Row: WithIndex<ProfileView>
        Insert: { trade_profile_id: string } & Partial<Omit<ProfileView, 'trade_profile_id' | 'id' | 'viewed_at'>>
        Update: Partial<ProfileView>
        Relationships: []
      }
      search_appearances: {
        Row: WithIndex<SearchAppearance>
        Insert: { trade_profile_id: string } & Partial<Omit<SearchAppearance, 'trade_profile_id' | 'id' | 'appeared_at'>>
        Update: Partial<SearchAppearance>
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
      profile_gallery_images: {
        Row: WithIndex<ProfileGalleryImage>
        Insert: { id?: string; trade_profile_id: string; storage_path: string } & Partial<Omit<ProfileGalleryImage, 'trade_profile_id' | 'storage_path' | 'id' | 'created_at'>>
        Update: Partial<ProfileGalleryImage>
        Relationships: []
      }
      integrity_signals: {
        Row: WithIndex<IntegritySignal>
        Insert: { user_id: string; kind: 'signup' | 'review' } & Partial<Omit<IntegritySignal, 'user_id' | 'kind' | 'id' | 'created_at'>>
        Update: Partial<IntegritySignal>
        Relationships: []
      }
      request_outcomes: {
        Row: WithIndex<RequestOutcome>
        Insert: { request_kind: RequestKind; request_id: string; recipient_id: string; outcome: RequestOutcomeKind; requested_at: string } & Partial<Omit<RequestOutcome, 'request_kind' | 'request_id' | 'recipient_id' | 'outcome' | 'requested_at' | 'id'>>
        Update: Partial<RequestOutcome>
        Relationships: []
      }
      job_evidence_claims: {
        Row: WithIndex<JobEvidenceClaim>
        Insert: { invite_kind: RequestKind; invite_id: string; requester_id: string; respondent_id: string; requester_statement: string } & Partial<Omit<JobEvidenceClaim, 'invite_kind' | 'invite_id' | 'requester_id' | 'respondent_id' | 'requester_statement' | 'id' | 'created_at'>>
        Update: Partial<JobEvidenceClaim>
        Relationships: []
      }
      job_evidence_files: {
        Row: WithIndex<JobEvidenceFile>
        Insert: { claim_id: string; storage_path: string; file_type: 'image' | 'pdf'; evidence_type: EvidenceType } & Partial<Omit<JobEvidenceFile, 'claim_id' | 'storage_path' | 'file_type' | 'evidence_type' | 'id' | 'created_at'>>
        Update: Partial<JobEvidenceFile>
        Relationships: []
      }
      category_rating_averages: {
        Row: WithIndex<{ trade_type: string; avg_rating: number; review_count: number; updated_at: string }>
        Insert: { trade_type: string; avg_rating: number } & Partial<{ review_count: number }>
        Update: Partial<{ avg_rating: number; review_count: number }>
        Relationships: []
      }
      job_early_end_details: {
        Row: WithIndex<{ job_id: string; ended_by: string | null; acted_by_user_id: string | null; note: string | null; created_at: string }>
        Insert: { job_id: string } & Partial<{ ended_by: string | null; acted_by_user_id: string | null; note: string | null }>
        Update: Partial<{ ended_by: string | null; acted_by_user_id: string | null; note: string | null }>
        Relationships: []
      }
      trade_insurance: {
        Row: WithIndex<TradeInsurance>
        Insert: { trade_id: string; insurer: string; cover_amount_gbp: number; expires_on: string } & Partial<Omit<TradeInsurance, 'trade_id' | 'insurer' | 'cover_amount_gbp' | 'expires_on' | 'id' | 'created_at'>>
        Update: Partial<TradeInsurance>
        Relationships: []
      }
      job_link_events: {
        Row: WithIndex<{ id: string; trade_profile_id: string; kind: 'visit' | 'request' | 'cap_hit'; created_at: string }>
        Insert: { trade_profile_id: string; kind: 'visit' | 'request' | 'cap_hit' }
        Update: Partial<{ kind: 'visit' | 'request' | 'cap_hit' }>
        Relationships: []
      }
      client_listing_submissions: {
        Row: WithIndex<ClientListingSubmission>
        Insert: { client_id: string; business_name: string; business_name_normalised: string; trade_category: string; district: string } & Partial<Omit<ClientListingSubmission, 'client_id' | 'business_name' | 'business_name_normalised' | 'trade_category' | 'district' | 'id' | 'created_at'>>
        Update: Partial<ClientListingSubmission>
        Relationships: []
      }
      search_events: {
        Row: WithIndex<{ id: string; created_at: string; district: string; trade_category: string; specialism: string | null; viewer_role: string; user_id: string | null; session_hash: string; real_count: number; seeded_count: number; boosted_count: number; demo_shown: boolean }>
        Insert: { district: string; trade_category: string; viewer_role: string; session_hash: string } & Partial<{ specialism: string | null; user_id: string | null; real_count: number; seeded_count: number; boosted_count: number; demo_shown: boolean }>
        Update: Partial<{ real_count: number }>
        Relationships: []
      }
      search_outcomes: {
        Row: WithIndex<{ id: string; created_at: string; search_event_id: string | null; kind: string; contact_type: string | null; trade_profile_id: string | null; district: string | null; trade_category: string | null; viewer_role: string | null }>
        Insert: { kind: string } & Partial<{ search_event_id: string | null; contact_type: string | null; trade_profile_id: string | null; district: string | null; trade_category: string | null; viewer_role: string | null }>
        Update: Partial<{ kind: string }>
        Relationships: []
      }
      search_weekly_rollups: {
        Row: WithIndex<{ week: string; district: string; trade_category: string; viewer_role: string; searches: number; unique_searchers: number; profile_views: number; contact_clicks: number }>
        Insert: { week: string; district: string; trade_category: string; viewer_role: string } & Partial<{ searches: number; unique_searchers: number; profile_views: number; contact_clicks: number }>
        Update: Partial<{ searches: number }>
        Relationships: []
      }
      admin_settings: {
        Row: WithIndex<{ key: string; value: unknown }>
        Insert: { key: string; value: unknown }
        Update: Partial<{ value: unknown }>
        Relationships: []
      }
      tier_grants: {
        Row: WithIndex<TierGrant>
        Insert: { user_id: string; tier: TierGrantTier; ends_at: string } & Partial<Omit<TierGrant, 'user_id' | 'tier' | 'ends_at' | 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<TierGrant>
        Relationships: []
      }
      tier_grant_events: {
        Row: WithIndex<TierGrantEvent>
        Insert: { grant_id: string; action: TierGrantAction } & Partial<Omit<TierGrantEvent, 'grant_id' | 'action' | 'id' | 'created_at'>>
        Update: Partial<TierGrantEvent>
        Relationships: []
      }
      photo_reports: {
        Row: WithIndex<PhotoReport>
        Insert: Partial<Omit<PhotoReport, 'id' | 'created_at'>>
        Update: Partial<PhotoReport>
        Relationships: []
      }
      pending_invites: {
        Row: WithIndex<PendingInvite>
        Insert: {
          inviting_client_id: string
          trade_name: string
          job_type: string
          job_date: string
          claim_token: string
        } & Partial<Omit<PendingInvite, 'inviting_client_id' | 'trade_name' | 'job_type' | 'job_date' | 'claim_token' | 'id' | 'created_at' | 'expires_at' | 'status'>>
        Update: Partial<PendingInvite>
        Relationships: []
      }
      seeded_profiles: {
        Row: WithIndex<SeededProfile>
        Insert: {
          slug: string
          business_name: string
          trade_category: string
          claim_token: string
          expires_at: string
        } & Partial<Omit<SeededProfile, 'slug' | 'business_name' | 'trade_category' | 'claim_token' | 'expires_at' | 'id' | 'created_at' | 'status'>>
        Update: Partial<SeededProfile>
        Relationships: []
      }
      do_not_reseed: {
        Row: WithIndex<DoNotReseed>
        Insert: { business_name_normalised: string } & Partial<Omit<DoNotReseed, 'business_name_normalised' | 'id' | 'created_at'>>
        Update: Partial<DoNotReseed>
        Relationships: []
      }
      boost_events: {
        Row: WithIndex<BoostEventRow>
        Insert: { event_type: BoostEventRow['event_type'] } & Partial<Omit<BoostEventRow, 'event_type'>>
        Update: Partial<BoostEventRow>
        Relationships: []
      }
      rate_limit_events: {
        Row: WithIndex<RateLimitEvent>
        Insert: { key: string } & Partial<Pick<RateLimitEvent, 'id' | 'created_at'>>
        Update: Partial<RateLimitEvent>
        Relationships: []
      }
    }
    // GenericSchema requires Views and Functions (non-optional)
    Views: { [_ in never]: never }
    Functions: {
      refresh_confirmation_stats: { Args: { p_user: string }; Returns: undefined }
      refresh_category_averages: { Args: Record<string, never>; Returns: undefined }
      refresh_ended_early: { Args: { p_trade: string | null; p_client: string | null }; Returns: undefined }
      rollup_old_search_events: { Args: Record<string, never>; Returns: number }
      refresh_hired_again: { Args: { p_trade: string }; Returns: undefined }
      refresh_all_confirmation_stats: { Args: Record<string, never>; Returns: undefined }
    }
  }
}
