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

export type V42Tables = {
  trade_bank_accounts: TableDef<TradeBankAccount, 'trade_id' | 'account_name' | 'sort_code' | 'account_number_encrypted' | 'account_number_last4'>
  open_banking_connect_states: TableDef<OpenBankingConnectState, 'state' | 'trade_id' | 'provider'>
  bank_matches: TableDef<BankMatch, 'trade_id' | 'provider_transaction_id' | 'received_at' | 'amount_pence' | 'match_status'>
  open_banking_usage: TableDef<OpenBankingUsage, 'trade_id' | 'month'>
  boost_district_settings: TableDef<BoostDistrictSetting, 'district'>
  boost_waitlist: TableDef<BoostWaitlistRow, 'user_id' | 'district' | 'trade_type'>
}
