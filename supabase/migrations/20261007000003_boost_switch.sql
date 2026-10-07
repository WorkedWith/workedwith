-- v3.5 Boosted District rework: Boost switch per district, free reactivation, swap, no cooldown.
--
-- boosted_district_addon_quantity       = add-on slots Stripe will bill from the next invoice
-- boosted_district_addon_paid_quantity  = add-on slots already paid for in the current billing period
--                                         (>= billed quantity; lets a trade switch a boost back on free
--                                         before the renewal date after switching a paid one off)

ALTER TABLE trade_profiles
  ADD COLUMN IF NOT EXISTS boosted_district_addon_paid_quantity int NOT NULL DEFAULT 0;

UPDATE trade_profiles
  SET boosted_district_addon_paid_quantity = boosted_district_addon_quantity
  WHERE boosted_district_addon_paid_quantity < boosted_district_addon_quantity;

-- Swap and boost log (abuse spotting, support). Written by the server only.
CREATE TABLE IF NOT EXISTS boost_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES public.users (id) ON DELETE SET NULL,
  event_type    text        NOT NULL CHECK (event_type IN ('on', 'off', 'swap', 'area_removed')),
  district      text,
  from_district text,
  to_district   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boost_events_user_created_idx ON boost_events (user_id, created_at DESC);

ALTER TABLE boost_events ENABLE ROW LEVEL SECURITY;
-- No policies: no client access. The service role (server actions) bypasses RLS.

GRANT ALL ON boost_events TO service_role;
