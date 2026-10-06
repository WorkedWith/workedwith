-- Replace radius-based search with postcode district matching
-- No live users — safe to drop radius_miles outright

ALTER TABLE trade_profiles
  DROP COLUMN IF EXISTS radius_miles,
  ADD COLUMN IF NOT EXISTS operating_areas text[] NOT NULL DEFAULT '{}';

-- GIN index for efficient district containment queries (@> operator)
CREATE INDEX IF NOT EXISTS idx_trade_profiles_operating_areas
  ON trade_profiles USING GIN (operating_areas);
