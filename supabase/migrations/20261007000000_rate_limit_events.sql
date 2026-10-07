CREATE TABLE rate_limit_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX rate_limit_events_key_time_idx
  ON rate_limit_events (key, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No anon or authenticated policies. All access via service role.
