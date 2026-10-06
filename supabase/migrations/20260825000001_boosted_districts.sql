-- Boosted Districts: Pro-only top-band search placement per district
-- subscription_period_start_at: billing cycle start (from Stripe), used for cooldown check
-- boosted_districts_updated_at: when the trade last changed their boost selection

ALTER TABLE trade_profiles
  ADD COLUMN IF NOT EXISTS boosted_districts text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS boosted_districts_updated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS subscription_period_start_at timestamptz NULL;

-- GIN index for potential future queries on boosted_districts
CREATE INDEX IF NOT EXISTS idx_trade_profiles_boosted_districts
  ON trade_profiles USING GIN (boosted_districts);
