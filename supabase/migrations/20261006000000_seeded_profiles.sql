-- seeded_profiles: admin-seeded trade listings for thin search results
CREATE TABLE seeded_profiles (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT        UNIQUE NOT NULL,
  business_name         TEXT        NOT NULL,
  trade_category        TEXT        NOT NULL,
  operating_areas       TEXT[]      NOT NULL DEFAULT '{}',
  contact_phone         TEXT,
  contact_email         TEXT,
  source_note           TEXT,
  status                TEXT        NOT NULL DEFAULT 'unclaimed'
                          CHECK (status IN ('unclaimed', 'claimed', 'removed')),
  claim_token           TEXT        UNIQUE NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ NOT NULL,
  claimed_by_user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reminder_21_sent_at   TIMESTAMPTZ,
  reminder_42_sent_at   TIMESTAMPTZ,
  reminder_56_sent_at   TIMESTAMPTZ
);

CREATE INDEX seeded_profiles_operating_areas_gin
  ON seeded_profiles USING GIN (operating_areas);
CREATE INDEX seeded_profiles_status_idx
  ON seeded_profiles (status);
CREATE INDEX seeded_profiles_claim_token_idx
  ON seeded_profiles (claim_token);
CREATE INDEX seeded_profiles_expires_at_idx
  ON seeded_profiles (expires_at) WHERE status = 'unclaimed';

ALTER TABLE seeded_profiles ENABLE ROW LEVEL SECURITY;
-- No anon or authenticated policies. All access is via the service-role client.

-- do_not_reseed: normalised names and hashed contact details only
CREATE TABLE do_not_reseed (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name_normalised TEXT        NOT NULL,
  phone_hash               TEXT,
  email_hash               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX do_not_reseed_name_idx
  ON do_not_reseed (business_name_normalised);
CREATE INDEX do_not_reseed_phone_idx
  ON do_not_reseed (phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX do_not_reseed_email_idx
  ON do_not_reseed (email_hash) WHERE email_hash IS NOT NULL;

ALTER TABLE do_not_reseed ENABLE ROW LEVEL SECURITY;
-- No policies — all access via service role
