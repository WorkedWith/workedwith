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

export type V42Tables = {
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
