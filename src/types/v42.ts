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

export type V42Tables = {
  boost_district_settings: TableDef<BoostDistrictSetting, 'district'>
  boost_waitlist: TableDef<BoostWaitlistRow, 'user_id' | 'district' | 'trade_type'>
}
