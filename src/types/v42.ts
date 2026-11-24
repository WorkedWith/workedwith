// v4.2 tables (quote to paid platform). Kept apart from database.ts so the new model reads in one place.
// Money is always integer pence.

type WithIndex<T> = T & Record<string, unknown>

/** A table entry where `Req` are the insert columns with no default. */
export type TableDef<Row, Req extends keyof Row> = {
  Row: WithIndex<Row>
  Insert: Pick<Row, Req> & Partial<Omit<Row, Req>>
  Update: Partial<Row>
  Relationships: []
}

// ── Phase 0: boosts ───────────────────────────────────────────

export interface BoostDistrictSetting {
  district: string
  boosts_enabled: boolean
  enabled_at: string | null
  enabled_by: string | null
  updated_at: string
}

export interface BoostWaitlistRow {
  id: string
  user_id: string
  district: string
  trade_type: string
  created_at: string
  notified_at: string | null
  removed_at: string | null
}

// ── Phase 1: getting paid set up ─────────────────────────────

export type BankConnectionStatus = 'not_connected' | 'connected' | 'needs_reconfirm' | 'lapsed' | 'unsupported'
export type CopResult = 'match' | 'close_match' | 'no_match' | 'unavailable'

export interface TradeBankAccount {
  id: string
  trade_id: string
  account_name: string
  sort_code: string
  account_number_encrypted: string
  account_number_last4: string
  confirmation_of_payee_result: CopResult | null
  confirmation_of_payee_name: string | null
  confirmation_of_payee_checked_at: string | null
  provider: string | null
  provider_connection_id: string | null
  provider_bank_name: string | null
  connected_at: string | null
  consent_expires_at: string | null
  last_synced_at: string | null
  connection_status: BankConnectionStatus
  reconfirm_notified_at: string | null
  lapsed_notified_at: string | null
  created_at: string
  updated_at: string
}

export interface OpenBankingConnectState {
  state: string
  trade_id: string
  provider: string
  created_at: string
  used_at: string | null
}

export type BankMatchStatus = 'matched' | 'part_payment' | 'overpayment' | 'suggested' | 'confirmed_by_trade' | 'rejected_by_trade'

export interface BankMatch {
  id: string
  trade_id: string
  provider_transaction_id: string
  received_at: string
  amount_pence: number
  payer_name: string | null
  reference: string | null
  match_status: BankMatchStatus
  invoice_id: string | null
  decided_at: string | null
  created_at: string
}

export interface OpenBankingUsage {
  id: string
  trade_id: string
  month: string
  connection_active: boolean
  data_refreshes: number
  cost_pence: number
}

// ── Phase 2: client accounts ──────────────────────────────────

export type AccessPurpose = 'quote' | 'job' | 'variation' | 'stage' | 'invoice' | 'review' | 'general'

export interface ClientAccessLink {
  id: string
  token_hash: string
  client_user_id: string
  purpose: AccessPurpose
  target_path: string
  created_by: string | null
  expires_at: string
  last_used_at: string | null
  created_at: string
}

// ── Phase 3: quotes ───────────────────────────────────────────

export type ClientKind = 'person' | 'company'
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'changes_requested' | 'declined' | 'expired' | 'withdrawn' | 'superseded'
export type DepositFor = 'materials' | 'labour' | 'materials_and_labour'
export type NonRefundableFrom = 'materials_ordered' | 'work_started' | 'payment'
export type PlannedStartType = 'date' | 'asap' | 'to_be_agreed'
export type PaymentTiming = 'on_completion' | 'in_stages'

export interface TermsSnapshot {
  standardTermsVersion: string
  standardTerms: string
  extraTerms: string | null
  cancellationNotice: string | null
  depositWording: string | null
  earlyStartConsentWording: string | null
}

export interface Quote {
  id: string
  job_id: string
  trade_user_id: string
  version: number
  status: QuoteStatus
  client_type: ClientKind
  client_name: string
  client_company_name: string | null
  client_mobile: string
  client_email: string
  job_address: string | null
  title: string
  description: string | null
  photo_paths: string[]
  valid_until: string
  deposit_required: boolean
  deposit_mode: 'amount' | 'percent' | null
  deposit_percent: number | null
  deposit_amount_pence: number
  deposit_for: DepositFor | null
  deposit_refundable: boolean
  deposit_non_refundable_from: NonRefundableFrom | null
  payment_timing: PaymentTiming
  planned_start_type: PlannedStartType
  planned_start_date: string | null
  vat_registered: boolean
  vat_applies: boolean
  vat_rate_bp: number
  net_pence: number
  vat_pence: number
  total_pence: number
  extra_terms: string | null
  terms_snapshot: TermsSnapshot | null
  follow_ups_enabled: boolean
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_by_user_id: string | null
  client_type_at_acceptance: ClientKind | null
  early_start_consent_at: string | null
  declined_at: string | null
  declined_reason: string | null
  withdrawn_at: string | null
  expired_at: string | null
  deposit_due_by: string | null
  created_at: string
  updated_at: string
}

export interface QuoteLine { id: string; quote_id: string; position: number; description: string; price_pence: number }
export interface QuoteStage { id: string; quote_id: string; position: number; name: string; amount_pence: number }
export interface QuoteChangeRequest { id: string; quote_id: string; note: string; requested_by_user_id: string | null; created_at: string; resolved_by_version: number | null }
export interface QuoteFollowUp { id: string; quote_id: string; kind: string; sent_at: string }

export type StageStatus = 'upcoming' | 'awaiting_approval' | 'issue_raised' | 'approved' | 'requested_by_trade' | 'part_paid' | 'paid' | 'overdue' | 'cancelled'

export interface PaymentStage {
  id: string
  job_id: string
  quote_id: string | null
  position: number
  name: string
  amount_pence: number
  is_deposit: boolean
  status: StageStatus
  marked_done_at: string | null
  approved_at: string | null
  approved_by_user_id: string | null
  requested_by_trade_at: string | null
  request_note: string | null
  due_at: string | null
  amount_paid_pence: number
  paid_at: string | null
  client_says_paid_at: string | null
  approval_reminder_5_at: string | null
  approval_reminder_10_at: string | null
  approval_reminder_14_at: string | null
  last_manual_reminder_at: string | null
  last_trade_response_at: string | null
  stalled_notified_at: string | null
  cancelled_at: string | null
  created_at: string
}

export interface SavedItem { id: string; trade_id: string; description: string; price_pence: number; vat_applies: boolean; created_at: string }

// ── Phase 4: start dates and job events ──────────────────────

export interface StartDateProposal {
  id: string
  job_id: string
  proposed_date: string
  proposed_by_user_id: string | null
  status: 'proposed' | 'confirmed' | 'countered' | 'withdrawn'
  decided_at: string | null
  decided_by_user_id: string | null
  early_start_consent_given: boolean
  created_at: string
}

export interface JobEvent {
  id: string
  job_id: string
  kind: string
  actor_user_id: string | null
  summary: string
  data: Record<string, unknown> | null
  created_at: string
}

// ── Phase 5: stages and payments ─────────────────────────────

export interface StageEvidence { id: string; stage_id: string; photo_paths: string[]; note: string | null; created_by: string | null; created_at: string }
export interface StageIssue { id: string; stage_id: string; raised_by_user_id: string | null; reason: string; photo_paths: string[]; status: 'open' | 'resubmitted' | 'resolved' | 'closed_by_request'; resolved_at: string | null; created_at: string }
export interface IssueNote { id: string; issue_id: string; author_user_id: string | null; note: string; photo_paths: string[]; created_at: string }

export type InvoiceStatus = 'issued' | 'part_paid' | 'paid' | 'credited'
export type ApprovalBasis = 'client_approved' | 'requested_by_trade' | 'deposit'

export interface Invoice {
  id: string
  trade_id: string
  job_id: string
  stage_id: string | null
  invoice_number: string
  sequence: number
  issued_at: string
  due_at: string
  net_pence: number
  vat_pence: number
  total_pence: number
  amount_paid_pence: number
  status: InvoiceStatus
  approval_basis: ApprovalBasis
  description: string
  pdf_path: string | null
  paid_at: string | null
  created_at: string
}

export type PaymentMethod = 'bank_transfer_matched' | 'bank_transfer_marked_by_trade' | 'paid_elsewhere_cash' | 'paid_elsewhere_cheque' | 'paid_elsewhere_other_account' | 'card' | 'wallet'

export interface Payment {
  id: string
  stage_id: string
  invoice_id: string | null
  job_id: string
  amount_pence: number
  method: PaymentMethod
  bank_match_id: string | null
  stripe_payment_intent_id: string | null
  stripe_fee_pence: number | null
  status: 'client_says_paid' | 'paid' | 'failed' | 'refunded'
  paid_at: string
  recorded_by: string | null
  client_confirmed_at: string | null
  client_disputed_at: string | null
  refunded_pence: number
  refund_marked_at: string | null
  refund_client_confirmed_at: string | null
  created_at: string
}

// ── Phase 6: credit notes ────────────────────────────────────

export interface CreditNote {
  id: string
  invoice_id: string
  trade_id: string
  job_id: string
  payment_id: string | null
  credit_note_number: string
  sequence: number
  amount_pence: number
  net_pence: number
  vat_pence: number
  reason: string
  kind: 'refund' | 'reduction'
  issued_at: string
  pdf_path: string | null
}

// ── Phase 7: variations ──────────────────────────────────────

export interface Variation {
  id: string
  job_id: string
  created_by: string | null
  description: string
  note: string | null
  amount_pence: number
  photo_paths: string[]
  status: 'sent' | 'approved' | 'declined' | 'withdrawn'
  target_stage_id: string | null
  new_stage_name: string | null
  sent_at: string
  decided_at: string | null
  decided_by_user_id: string | null
  decline_note: string | null
  applied_to_stage_id: string | null
  created_at: string
}

// ── Phase 8: chasing and letters ─────────────────────────────

export type ChaseStep = 'heads_up' | 'due_today' | 'late_1' | 'late_2' | 'final' | 'lba_prompt' | 'review_window'

export interface ChaseEvent { id: string; stage_id: string; job_id: string; step: ChaseStep; channel: string; sent_at: string; opened_at: string | null; paused: boolean; stopped_by: string | null }

export interface LegalDocument {
  id: string
  job_id: string
  type: 'letter_before_action' | 'claim_pack' | 'chargeback_evidence'
  version: 'person' | 'company' | null
  file_path: string | null
  data: Record<string, unknown> | null
  generated_at: string
  sent_at: string | null
  response_due_at: string | null
  created_by: string | null
}

// ── Phase 9: reviews and client record ───────────────────────

export interface ReviewPhoto { id: string; review_id: string; path: string; moderation_status: 'pending' | 'approved' | 'rejected'; created_at: string }
export interface ClientRecordView { id: string; trade_id: string; client_id: string; reason: 'quoting' | 'lookup'; job_id: string | null; viewed_at: string }

// ── Phase 10: directory ──────────────────────────────────────

export interface ProfileContactClick { id: string; trade_profile_id: string | null; seeded_profile_id: string | null; kind: 'email_now' | 'call'; viewer_role: string | null; created_at: string }
export interface SeededProfileView { id: string; seeded_profile_id: string; created_at: string }

// ── Phase 11: accounting ─────────────────────────────────────

export type AccountingPlatform = 'xero' | 'quickbooks' | 'freeagent' | 'sage'
export type SyncEntity = 'contact' | 'invoice' | 'payment' | 'credit_note' | 'refund'

export interface AccountingConnection {
  id: string
  trade_id: string
  platform: AccountingPlatform
  external_org_id: string | null
  external_org_name: string | null
  tokens_encrypted: string | null
  token_expires_at: string | null
  sales_account_code: string | null
  payment_account_id: string | null
  vat_mapping: Record<string, string> | null
  sync_from: string | null
  status: 'setup' | 'connected' | 'expired' | 'revoked' | 'error'
  connected_at: string | null
  expired_notified_at: string | null
  setup_options: { sales: { id: string; code: string | null; name: string }[]; bank: { id: string; code: string | null; name: string }[]; defaultSales: string | null; defaultBank: string | null } | null
  created_at: string
  updated_at: string
}

export interface AccountingConnectState { state: string; trade_id: string; platform: string; created_at: string; used_at: string | null }

export interface AccountingSyncItem {
  id: string
  connection_id: string
  trade_id: string
  entity_type: SyncEntity
  entity_id: string
  external_id: string | null
  status: 'pending' | 'synced' | 'failed'
  attempts: number
  last_error: string | null
  first_attempt_at: string | null
  next_attempt_at: string
  synced_at: string | null
  created_at: string
}

// ── Phase 13: cards ──────────────────────────────────────────

export interface TradeCardAccount { id: string; trade_id: string; stripe_account_id: string; charges_enabled: boolean; payouts_enabled: boolean; card_limit_pence: number; cards_enabled: boolean; created_at: string; updated_at: string }

export interface Chargeback {
  id: string
  payment_id: string
  job_id: string
  trade_id: string
  stripe_dispute_id: string
  amount_pence: number
  reason: string | null
  opened_at: string
  evidence_due_at: string | null
  evidence_note: string | null
  evidence_submitted_at: string | null
  deadline_reminder_sent_at: string | null
  outcome: 'won' | 'lost' | 'warning_closed' | null
  closed_at: string | null
}

export type V42Tables = {
  trade_card_accounts: TableDef<TradeCardAccount, 'trade_id' | 'stripe_account_id'>
  chargebacks: TableDef<Chargeback, 'payment_id' | 'job_id' | 'trade_id' | 'stripe_dispute_id' | 'amount_pence'>
  accounting_connections: TableDef<AccountingConnection, 'trade_id' | 'platform'>
  accounting_connect_states: TableDef<AccountingConnectState, 'state' | 'trade_id' | 'platform'>
  accounting_sync_items: TableDef<AccountingSyncItem, 'connection_id' | 'trade_id' | 'entity_type' | 'entity_id'>
  profile_contact_clicks: TableDef<ProfileContactClick, never>
  seeded_profile_views: TableDef<SeededProfileView, 'seeded_profile_id'>
  review_photos: TableDef<ReviewPhoto, 'review_id' | 'path'>
  client_record_views: TableDef<ClientRecordView, 'trade_id' | 'client_id' | 'reason'>
  chase_events: TableDef<ChaseEvent, 'stage_id' | 'job_id' | 'step'>
  legal_documents: TableDef<LegalDocument, 'job_id' | 'type'>
  variations: TableDef<Variation, 'job_id' | 'description' | 'amount_pence'>
  credit_notes: TableDef<CreditNote, 'invoice_id' | 'trade_id' | 'job_id' | 'credit_note_number' | 'sequence' | 'amount_pence' | 'net_pence' | 'reason'>
  stage_evidence: TableDef<StageEvidence, 'stage_id'>
  stage_issues: TableDef<StageIssue, 'stage_id' | 'reason'>
  issue_notes: TableDef<IssueNote, 'issue_id' | 'note'>
  invoices: TableDef<Invoice, 'trade_id' | 'job_id' | 'invoice_number' | 'sequence' | 'due_at' | 'net_pence' | 'total_pence' | 'approval_basis' | 'description'>
  payments: TableDef<Payment, 'stage_id' | 'job_id' | 'amount_pence' | 'method'>
  start_date_proposals: TableDef<StartDateProposal, 'job_id' | 'proposed_date'>
  job_events: TableDef<JobEvent, 'job_id' | 'kind' | 'summary'>
  quotes: TableDef<Quote, 'job_id' | 'trade_user_id' | 'client_name' | 'client_mobile' | 'client_email' | 'title' | 'valid_until'>
  quote_lines: TableDef<QuoteLine, 'quote_id' | 'position' | 'description' | 'price_pence'>
  quote_stages: TableDef<QuoteStage, 'quote_id' | 'position' | 'name' | 'amount_pence'>
  quote_change_requests: TableDef<QuoteChangeRequest, 'quote_id' | 'note'>
  quote_follow_ups: TableDef<QuoteFollowUp, 'quote_id' | 'kind'>
  payment_stages: TableDef<PaymentStage, 'job_id' | 'position' | 'name' | 'amount_pence'>
  saved_items: TableDef<SavedItem, 'trade_id' | 'description' | 'price_pence'>
  client_access_links: TableDef<ClientAccessLink, 'token_hash' | 'client_user_id' | 'target_path'>
  trade_bank_accounts: TableDef<TradeBankAccount, 'trade_id' | 'account_name' | 'sort_code' | 'account_number_encrypted' | 'account_number_last4'>
  open_banking_connect_states: TableDef<OpenBankingConnectState, 'state' | 'trade_id' | 'provider'>
  bank_matches: TableDef<BankMatch, 'trade_id' | 'provider_transaction_id' | 'received_at' | 'amount_pence' | 'match_status'>
  open_banking_usage: TableDef<OpenBankingUsage, 'trade_id' | 'month'>
  boost_district_settings: TableDef<BoostDistrictSetting, 'district'>
  boost_waitlist: TableDef<BoostWaitlistRow, 'user_id' | 'district' | 'trade_type'>
}
