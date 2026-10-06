-- v3.3: boosted district add-on quantity + DB-level subset constraint

ALTER TABLE trade_profiles
  ADD COLUMN IF NOT EXISTS boosted_district_addon_quantity int NOT NULL DEFAULT 0;

-- Enforce subset rule at DB level: every boosted district must be in operating_areas.
-- The application already validates this, but this constraint is the safety net.
ALTER TABLE trade_profiles
  ADD CONSTRAINT boosted_districts_subset_of_operating
  CHECK (boosted_districts <@ operating_areas);
