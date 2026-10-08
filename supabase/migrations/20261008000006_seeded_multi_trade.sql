-- Seeded listings can carry several trades. trade_category stays as the
-- primary (first) trade so existing screens and emails keep working.
ALTER TABLE seeded_profiles
  ADD COLUMN IF NOT EXISTS trade_categories text[] NOT NULL DEFAULT '{}';

UPDATE seeded_profiles
  SET trade_categories = ARRAY[trade_category]
  WHERE trade_categories = '{}' AND trade_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS seeded_profiles_trade_categories_gin
  ON seeded_profiles USING GIN (trade_categories);
